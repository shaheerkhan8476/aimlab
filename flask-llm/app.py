import os
import json
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")

# if OpenAI API key is missing, then raise an error
if not openai_api_key:
    raise ValueError("Missing OpenAI API Key. Please set OPENAI_API_KEY in the .env file.")

client = OpenAI(api_key=openai_api_key)

app = Flask(__name__)
#test comment
@app.route("/", methods=["GET"])
def home():
    """
    Basic route to confirm the Flask microservice is up.
    """
    return {"message": "Flask & OpenAI microservice is working ! "}


@app.route("/api/message-request", methods=["POST"])
def message_request():
    """
    1) If task_type == "patient_question", the LLM sees patient_message
       in both sample_response & feedback.
    2) If task_type != "patient_question", we remove patient_message from GIGA JSON,
       so the LLM never sees it for sample or feedback.
    3) The sample_response ALWAYS omits user_message from consideration.
    4) The feedback ALWAYS uses the final GIGA JSON + user_message (so it can "grade" the student's response).
    5) The LLM must return raw JSON with exactly two keys:
         "sample_response"
         "feedback_response"
       in unformatted plaintext (no bold, markdown, etc.).
    """

    import json
    from flask import Response, jsonify

    original_data = request.get_json() or {}
    user_message = original_data.get("user_message", "")
    task_type = original_data.get("task_type", "patient_question")

    # ---------------------------------------------------------
    # 1) Remove patient_message entirely if not patient_question
    # ---------------------------------------------------------
    if task_type != "patient_question":
        original_data.pop("patient_message", None)
        if "patient" in original_data:
            original_data["patient"].pop("patient_message", None)

    # ---------------------------------------------------------
    # 2) For the sample response, we do NOT include user_message or task_type
    # ---------------------------------------------------------
    data_for_first_paragraph = dict(original_data)
    data_for_first_paragraph.pop("user_message", None)
    data_for_first_paragraph.pop("task_type", None)
    data_for_first_str = json.dumps(data_for_first_paragraph, indent=2)

    # ---------------------------------------------------------
    # 3) For the feedback, we show the entire final data (minus patient_message if not patient_question),
    #    plus we pass user_message separately so it can be "graded."
    # ---------------------------------------------------------
    full_json_str = json.dumps(original_data, indent=2)

    # ---------------------------------------------------------
    # 4) The prompt for the SAMPLE RESPONSE.
    # ---------------------------------------------------------
    universal_intro = f"""
You are an AI assistant. You must return EXACTLY one JSON object with the two keys:
"sample_response" and "feedback_response".

No markdown, no bold text, no italics. Plain text only.

Below is partial GIGA JSON (without user_message & possibly without patient_message if not patient_question):
{data_for_first_str}

Craft the sample response as if you were a medical student. Be concise, professional, and end quickly.
Put this text in the "sample_response" field of your JSON output.
"""

    if task_type == "patient_question":
        task_specific_part = """
Since task_type is patient_question, this is a direct patient inquiry. Provide a succinct, 
patient-friendly explanation or plan. No farewell or filler.
        """
    elif task_type == "lab_result":
        task_specific_part = """
Since task_type is lab_result, provide a succinct interpretation of the lab results 
and relevant next steps. No concluding phrases or farewells.
        """
    elif task_type == "prescription":
        task_specific_part = """
Since task_type is prescription, provide a concise plan for prescription changes, 
refills, or dosage. Avoid farewells or fluff.
        """
    else:
        task_specific_part = """
Unknown task_type. Provide a concise, professional response with no concluding words or farewells.
        """

    first_paragraph = universal_intro + task_specific_part

    # ---------------------------------------------------------
    # 5) The prompt for the FEEDBACK.
    # ---------------------------------------------------------
    second_paragraph = f"""
Now create the "feedback_response" in plain text, based on the COMPLETE GIGA JSON:
{full_json_str}

The student's actual response was: "{user_message}"

Explain what might be missing or unclear, and how to improve clarity, correctness, or completeness.

REMEMBER: Output must be valid JSON with exactly these 2 keys:
"sample_response" and "feedback_response"
No extra keys, no markup.
"""

    # ---------------------------------------------------------
    # Combine into final prompt
    # ---------------------------------------------------------
    prompt = f"""
FIRST PARAGRAPH (Sample Response Instructions):
{first_paragraph}

SECOND PARAGRAPH (Feedback Instructions):
{second_paragraph}
"""

    try:
        # Same call as original, except we expect raw JSON from GPT with sample_response & feedback_response.
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.7
        )
        text_output = response.choices[0].message.content.strip()

        # Return GPT's raw JSON directly, as "application/json"
        return Response(text_output, mimetype="application/json")

    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
    # Run on port 5000 for local testing
    app.run(host="0.0.0.0", port=5001)