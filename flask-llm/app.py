import os
import json
from flask import Flask, request, jsonify, Response
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")

if not openai_api_key:
    raise ValueError("Missing OpenAI API Key. Please set OPENAI_API_KEY in the .env file.")

client = OpenAI(api_key=openai_api_key)

app = Flask(__name__)

@app.route("/", methods=["GET"])
def home():
    """
    Basic route to confirm the Flask microservice is up.
    """
    return {"message": "Flask & OpenAI microservice is working !"}

@app.route("/api/message-request", methods=["POST"])
def message_request():
    """
    1) If task_type == "patient_question", the LLM sees patient_message in both sample_response & feedback.
    2) If task_type != "patient_question", remove patient_message so the LLM never sees it.
    3) The sample_response ALWAYS omits user_message.
    4) The feedback ALWAYS uses the complete final JSON plus user_message to grade the student's response.
    5) The LLM must output exactly one JSON object with only the two keys:
         "sample_response" and "feedback_response"
       and each of their values must be plain text (no nested key values).
    6) NEW: The new student_refilled field is only considered if task_type is "prescription". For non-prescription tasks, any false value is treated as null.
    7) NEW: If a mission is provided, include it in the sample response instructions so the response adheres to the specific task instruction.
    8) NEW: In the feedback instructions, refer to the complete JSON as "comprehensive patient information" instead of "giga json."
    9) NEW: Regardless of task type, include the base instructions:
         "You are a medical student replying to an EHR message from a patient who is under your care. You are their primary healthcare provider."
         "Your response should be professional, concise, patient-friendly, and authoritative. Ask the patient questions if necessary."
    10) NEW: Additionally, if task_type is patient_question, add:
         "If the patient message is related to mental health, give them a disclaimer about calling the Suicide & Crisis Lifeline at 988."
    """
    original_data = request.get_json() or {}
    user_message = original_data.get("user_message", "")
    task_type = original_data.get("task_type", "patient_question")

    # 1) Remove patient_message if task_type is not patient_question
    if task_type != "patient_question":
        original_data.pop("patient_message", None)
        if "patient" in original_data:
            original_data["patient"].pop("patient_message", None)

    # 6) For non-prescription tasks, remove the student_refilled field so that false is treated as null.
    if task_type != "prescription":
        original_data.pop("student_refilled", None)

    # 2) Prepare data for the sample response: remove user_message and task_type.
    data_for_first_paragraph = dict(original_data)
    data_for_first_paragraph.pop("user_message", None)
    data_for_first_paragraph.pop("task_type", None)
    data_for_first_str = json.dumps(data_for_first_paragraph, indent=2)

    # 3) Prepare full JSON string for feedback.
    full_json_str = json.dumps(original_data, indent=2)

    # 7) Retrieve the mission if provided.
    mission_text = original_data.get("mission", "")

    # 9) Base instructions added regardless of task type.
    base_instructions = (
        "You are a medical student replying to an EHR message from a patient who is under your care. "
        "You are their primary healthcare provider. "
        "Your response should be professional, concise, patient-friendly, and authoritative. "
        "Ask the patient questions if necessary."
    )

    universal_intro = f"""
You are an AI assistant. You must return EXACTLY one JSON object with the two keys:
"sample_response" and "feedback_response".

No markdown, no bold text, no italics. Plain text only.

Below is partial GIGA JSON (without user_message and, if task_type is not patient_question, without patient_message):
{data_for_first_str}

{base_instructions}
"""
    if mission_text:
        universal_intro += f"\nThe mission for this task is: {mission_text}\nEnsure your sample response adheres to this instruction."
    universal_intro += "\nCraft the sample response as if you were a medical student. Be concise, professional, and end quickly.\nPut this text in the \"sample_response\" field of your JSON output."

    # Task-specific instructions.
    if task_type == "patient_question":
        task_specific_part = """
Since task_type is patient_question, this is a direct patient inquiry. Provide a succinct, 
patient-friendly explanation or plan. No farewell or filler.
If the patient message is related to mental health, give them a disclaimer about calling the Suicide & Crisis Lifeline at 988.
        """
    elif task_type == "lab_result":
        task_specific_part = """
Since task_type is lab_result, provide a succinct interpretation of the lab results 
and relevant next steps. No concluding phrases or farewells.
        """
    elif task_type == "prescription":
        task_specific_part = """
Since task_type is prescription, provide a concise plan for prescription changes, 
refills, or dosage. (Note: the student_refilled field indicates if the prescription should be refilled: true means refill, false means not refill.)
Avoid farewells or fluff.
        """
    else:
        task_specific_part = """
Unknown task_type. Provide a concise, professional response with no concluding words or farewells.
        """

    first_paragraph = universal_intro + task_specific_part

    # 8) Build the prompt for feedback, referring to the complete JSON as "comprehensive patient information".
    second_paragraph = f"""
Now create the "feedback_response" in plain text, based on the COMPLETE comprehensive patient information:
{full_json_str}

The student's actual response was: "{user_message}"

Explain what might be missing or unclear, and how to improve clarity, correctness, or completeness.

REMEMBER: Output must be valid JSON with exactly these 2 keys:
"sample_response" and "feedback_response"
No extra keys, no markup.
"""

    prompt = f"""
FIRST PARAGRAPH (Sample Response Instructions):
{first_paragraph}

SECOND PARAGRAPH (Feedback Instructions):
{second_paragraph}
"""

    # Reprompt up to 10 times until valid JSON is produced.
    max_attempts = 10
    attempts = 0
    valid_output = None

    while attempts < max_attempts:
        try:
            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=600,
                temperature=0.7
            )
            text_output = response.choices[0].message.content.strip()
            # Check if the output is valid JSON.
            json.loads(text_output)
            valid_output = text_output
            break
        except json.JSONDecodeError:
            attempts += 1

    if valid_output is None:
        return jsonify({"error": "Failed to produce valid JSON after 10 attempts"}), 500

    return Response(valid_output, mimetype="application/json")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
