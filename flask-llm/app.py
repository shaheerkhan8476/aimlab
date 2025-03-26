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

@app.route("/api/generate", methods=["POST"])
def generate_text():
    """
    Original endpoint for generic prompts.
    Expects JSON: { "prompt": "Hello from Postman" }
    Returns AI completion in JSON: { "completion": "..." }
    """
    data = request.get_json() or {}
    prompt = data.get("prompt", "")

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.7
        )
        text_output = response.choices[0].message.content.strip()
        return jsonify({"completion": text_output})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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



@app.route("/api/hardcoded-case", methods=["GET"])
def get_enhanced_case():
    """
    Hard coded case, adjust fields as needed.
    """
    case_data = {
        "id": "patient-1234",
        "name": "Jane Smith",
        "dob": "1985-03-14",
        "age": "38",
        "gender": "Female",
        "contactInfo": {
            "address": "123 Oak Street, Lansing, MI",
            "phone": "555-123-4567",
            "emergencyContact": "John Smith: 555-987-6543"
        },
        "reasonForVisit": "Persistent cough and mild wheezing for the past 2 weeks.",
        "medicalHistory": [
            {
                "id": "hist-1",
                "name": "Asthma diagnosed",
                "date": "2003-05-01",
                "misc": ["Prescribed Albuterol inhaler PRN"]
            },
            {
                "id": "hist-2",
                "name": "Seasonal Allergies",
                "date": "2010-03-15",
                "misc": ["Uses OTC antihistamines occasionally"]
            }
        ],
        "surgicalHistory": [
            {
                "id": "surg-1",
                "name": "Appendectomy",
                "date": "2012-08-20",
                "misc": []
            }
        ],
        "medications": ["Albuterol inhaler PRN", "Loratadine 10mg QD"],
        "allergies": ["Peanuts", "Penicillin"],
        "healthConditions": ["Asthma", "Seasonal Allergies"],
        "familyHistory": ["Mother: Hypertension", "Father: Type 2 Diabetes"],
        "socialHistory": ["Former smoker (quit 2016)", "Social alcohol (1-2 drinks/week)"],
        "recentLabs": [
            {
                "id": "lab-1",
                "name": "Complete Blood Count (CBC)",
                "date": "2025-01-15",
                "results": "Slightly elevated WBC (12,000)"
            },
            {
                "id": "lab-2",
                "name": "Cholesterol Panel",
                "date": "2025-01-15",
                "results": "LDL 130 mg/dL, HDL 40 mg/dL, Triglycerides 140 mg/dL"
            }
        ],
        "messageFromPatient": (
            "Doctor, I've been coughing and wheezing more often. "
            "My inhaler doesn't feel as effective as before. "
            "Should I change my dosage or medication?"
        )
    }
    return jsonify(case_data)

@app.route("/api/feedback-on-response", methods=["POST"])
def feedback_on_response():
    """
    Expects JSON format:
    {
      "patientCase": { ... },
      "studentResponse": "Here's my plan..."
    }
    (feedback on how accurate the student's response is)
    """
    data = request.get_json() or {}
    patient_case = data.get("patientCase", {})
    student_resp = data.get("studentResponse", "")

    if not patient_case or not student_resp:
        return jsonify({"error": "Missing case or studentResponse"}), 400

    # Prompt summarizing the patient's details and the student's plan
    prompt = (
        "You are an AI tutor reviewing a medical student's plan for a patient.\n"
        "Here is the patient's case:\n\n"
        f"Name: {patient_case.get('name')}\n"
        f"Date of Birth: {patient_case.get('dob')}\n"
        f"Reason for Visit: {patient_case.get('reasonForVisit')}\n"
        f"Medical History: {patient_case.get('medicalHistory')}\n"
        f"Surgical History: {patient_case.get('surgicalHistory')}\n"
        f"Medications: {patient_case.get('medications')}\n"
        f"Allergies: {patient_case.get('allergies')}\n"
        f"Recent Labs: {patient_case.get('recentLabs')}\n"
        f"Patient Message: {patient_case.get('messageFromPatient')}\n\n"
        "The student responded with:\n"
        f"{student_resp}\n\n"
        "Please provide constructive feedback in bullet points, focusing on whether the "
        "plan addresses the patient's concerns, medication adjustments/refills, "
        "possible side effects, and next steps. Also evaluate clarity and completeness."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.7
        )
        feedback_text = response.choices[0].message.content.strip()
        return jsonify({"feedback": feedback_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Run on port 5000 for local testing
    app.run(host="0.0.0.0", port=5001)