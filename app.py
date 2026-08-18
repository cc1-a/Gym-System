import os
import json
import uuid
import qrcode
import io
import requests
from datetime import datetime, timedelta, timezone
from flask import Flask, render_template, request, redirect, url_for, send_file, flash, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'your_super_secret_key')

FIREBASE_API_KEY = os.environ.get("FIREBASE_API_KEY", "")
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "gym-app-14a1b")
WABOT_INSTANCE_ID = os.environ.get("WABOT_INSTANCE_ID", "")
WABOT_ACCESS_TOKEN = os.environ.get("WABOT_ACCESS_TOKEN", "")

def load_data():
    try:
        url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/appData/main?key={FIREBASE_API_KEY}"
        r = requests.get(url)
        if r.status_code == 200:
            doc = r.json()
            data_str = doc.get("fields", {}).get("json_data", {}).get("stringValue", "{}")
            data = json.loads(data_str)
        else:
            data = {}
            
        for key in ["packages", "members", "attendance", "gym_qrs", "admin"]:
            if key not in data:
                if key == "gym_qrs":
                    data[key] = {}
                elif key == "admin":
                    data[key] = {"phone": ""}
                else:
                    data[key] = []
        return data
    except Exception as e:
        print("Error loading from Firestore:", e)
        return {"packages": [], "members": [], "attendance": [], "gym_qrs": {}}

def save_data(data):
    try:
        url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/appData/main?key={FIREBASE_API_KEY}"
        payload = {
            "fields": {
                "json_data": {
                    "stringValue": json.dumps(data)
                }
            }
        }
        r = requests.patch(url, json=payload)
        if r.status_code == 404: 
            url_post = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/appData?documentId=main&key={FIREBASE_API_KEY}"
            r = requests.post(url_post, json=payload)
        if r.status_code not in (200, 201):
            print("Failed to save to Firestore:", r.text)
    except Exception as e:
        print("Error saving to Firestore:", e)

def get_current_year_qrs():
    """Ensure there's a QR code for the current year."""
    data = load_data()
    current_year = str(datetime.now(timezone.utc).year)
    
    if current_year not in data['gym_qrs']:
        data['gym_qrs'][current_year] = {
            "primary": str(uuid.uuid4()),
            "secondary": str(uuid.uuid4())
        }
        save_data(data)
    
    return data['gym_qrs'][current_year]

def send_whatsapp_message(phone, message):
    url = "https://app.wabot.my/api/send"
    payload = {
        "number": phone,
        "type": "text",
        "message": message,
        "instance_id": WABOT_INSTANCE_ID,
        "access_token": WABOT_ACCESS_TOKEN
    }
    try:
        response = requests.post(url, json=payload)
        print(f"[WABOT] Sent message to {phone}, response: {response.text}")
    except Exception as e:
        print(f"[WABOT] Failed to send message: {e}")

@app.route("/")
def home():
    return redirect(url_for("admin_dashboard"))

@app.route("/admin")
def admin_dashboard():
    data = load_data()
    packages = data.get("packages", [])
    members = data.get("members", [])
    attendance = data.get("attendance", [])

    # Enrich members and sort
    for mem in members:
        if mem.get("end_date"):
            try:
                mem['end_date_obj'] = datetime.fromisoformat(mem['end_date'])
            except ValueError:
                mem['end_date_obj'] = None
        mem['package_name'] = next((p['name'] for p in packages if p['id'] == mem.get('package_id')), "Unknown")

    # Enrich attendance with member info
    for att in attendance:
        att_member = next((m for m in members if m['id'] == att['member_id']), None)
        att['member_name'] = att_member['name'] if att_member else "Unknown"
        try:
            att['timestamp_obj'] = datetime.fromisoformat(att['timestamp'])
        except ValueError:
            att['timestamp_obj'] = None

    # Sort attendance newest first
    attendance.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    current_qrs = get_current_year_qrs()
    admin_phone = data.get("admin", {}).get("phone", "")
    
    return render_template("admin.html", 
                           packages=packages, 
                           members=members, 
                           attendance=attendance,
                           current_qrs=current_qrs,
                           current_year=datetime.now(timezone.utc).year,
                           firebase_api_key=FIREBASE_API_KEY,
                           admin_phone=admin_phone)

@app.route("/admin/settings", methods=["POST"])
def save_admin_settings():
    phone = request.form.get("phone")
    if phone:
        if not phone.startswith("94"):
            phone = "94" + phone.lstrip("0")
        data = load_data()
        if "admin" not in data:
            data["admin"] = {}
        data["admin"]["phone"] = phone
        save_data(data)
        flash("Admin settings saved.", "success")
    return redirect(url_for("admin_dashboard"))

@app.route("/api/cron/check_memberships", methods=["GET", "POST"])
def cron_check_memberships():
    data = load_data()
    admin_phone = data.get("admin", {}).get("phone")
    if not admin_phone:
        return jsonify({"error": "Admin phone not set"}), 400
        
    members = data.get("members", [])
    expiring_this_month = []
    
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    for mem in members:
        if mem.get("end_date"):
            try:
                end_date = datetime.fromisoformat(mem["end_date"])
                if end_date.month == current_month and end_date.year == current_year:
                    expiring_this_month.append(f"- {mem['name']} ({mem.get('phone','')}) on {end_date.strftime('%b %d')}")
            except ValueError:
                pass
                
    if expiring_this_month:
        msg = f"Gym Memberships Expiring in {now.strftime('%B %Y')}:\n" + "\n".join(expiring_this_month)
        send_whatsapp_message(admin_phone, msg)
        return jsonify({"success": True, "message": "Notification sent."}), 200
        
    return jsonify({"success": True, "message": "No memberships expiring this month."}), 200

# --- PACKAGE ROUTES ---

@app.route("/admin/package", methods=["POST"])
def add_package():
    name = request.form.get("name")
    price = request.form.get("price")
    duration_months = request.form.get("duration_months")
    
    if name and price and duration_months:
        data = load_data()
        package_id = str(uuid.uuid4())[:8]
        data["packages"].append({
            "id": package_id,
            "name": name,
            "price": float(price),
            "duration_months": int(duration_months),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        save_data(data)
        flash("Package added successfully!", "success")
    else:
        flash("Failed to add package. Please fill all fields.", "error")
    return redirect(url_for("admin_dashboard"))

@app.route("/admin/package/edit/<pkg_id>", methods=["POST"])
def edit_package(pkg_id):
    data = load_data()
    name = request.form.get("name")
    price = request.form.get("price")
    duration_months = request.form.get("duration_months")
    
    pkg = next((p for p in data["packages"] if p['id'] == pkg_id), None)
    if pkg and name and price and duration_months:
        pkg['name'] = name
        pkg['price'] = float(price)
        pkg['duration_months'] = int(duration_months)
        save_data(data)
        flash("Package updated successfully!", "success")
    else:
        flash("Error updating package.", "error")
    return redirect(url_for("admin_dashboard"))

@app.route("/admin/package/delete/<pkg_id>", methods=["POST"])
def delete_package(pkg_id):
    data = load_data()
    data["packages"] = [p for p in data["packages"] if p['id'] != pkg_id]
    save_data(data)
    flash("Package deleted.", "success")
    return redirect(url_for("admin_dashboard"))

# --- MEMBER ROUTES ---

@app.route("/admin/member", methods=["POST"])
def register_member():
    name = request.form.get("name")
    email = request.form.get("email")
    phone = request.form.get("phone")
    password = request.form.get("password")
    package_id = request.form.get("package_id")
    profile_pic_url = request.form.get("profile_pic_url", "")
    
    if name and email and phone and password and package_id:
        if not phone.startswith("94"):
            phone = "94" + phone.lstrip("0")
            
        data = load_data()
        selected_pkg = next((p for p in data.get("packages", []) if p['id'] == package_id), None)
        if not selected_pkg:
            flash("Selected package does not exist.", "error")
            return redirect(url_for("admin_dashboard"))

        duration_months = selected_pkg.get("duration_months", 1)
        registration_date = datetime.now(timezone.utc)
        end_date = registration_date + timedelta(days=duration_months * 30)
        
        member_id = str(uuid.uuid4())
        
        data["members"].append({
            "id": member_id,
            "name": name,
            "email": email,
            "phone": phone,
            "password": password,
            "package_id": package_id,
            "profile_pic_url": profile_pic_url,
            "registration_date": registration_date.isoformat(),
            "end_date": end_date.isoformat(),
            "is_first_login": True,
            "is_paid": False
        })
        save_data(data)
        
        msg = f"Hello {name}, your registration is complete! You have been subscribed to the {selected_pkg['name']} plan for {duration_months} month(s). Valid until {end_date.strftime('%b %d, %Y')}."
        send_whatsapp_message(phone, msg)
        flash("Member registered successfully!", "success")
    else:
        flash("Failed to register member.", "error")
        
    return redirect(url_for("admin_dashboard"))

@app.route("/admin/member/edit/<mem_id>", methods=["POST"])
def edit_member(mem_id):
    data = load_data()
    name = request.form.get("name")
    email = request.form.get("email")
    phone = request.form.get("phone")
    password = request.form.get("password")
    profile_pic_url = request.form.get("profile_pic_url")
    
    mem = next((m for m in data["members"] if m['id'] == mem_id), None)
    if mem and name and email and phone:
        if not phone.startswith("94"):
            phone = "94" + phone.lstrip("0")
            
        mem['name'] = name
        mem['email'] = email
        mem['phone'] = phone
        if password:  
            mem['password'] = password
        if profile_pic_url:
            mem['profile_pic_url'] = profile_pic_url
        save_data(data)
        flash("Member updated successfully!", "success")
    else:
        flash("Error updating member.", "error")
    return redirect(url_for("admin_dashboard"))

@app.route("/admin/member/delete/<mem_id>", methods=["POST"])
def delete_member(mem_id):
    data = load_data()
    data["members"] = [m for m in data["members"] if m['id'] != mem_id]
    save_data(data)
    flash("Member deleted.", "success")
    return redirect(url_for("admin_dashboard"))

@app.route("/admin/member/toggle_paid/<mem_id>", methods=["POST"])
def toggle_paid(mem_id):
    data = load_data()
    mem = next((m for m in data["members"] if m['id'] == mem_id), None)
    if mem:
        current_status = mem.get("is_paid", False)
        mem["is_paid"] = not current_status
        save_data(data)
        
        status_str = "PAID" if mem["is_paid"] else "UNPAID"
        flash(f"Member marked as {status_str}.", "success")
        
        if mem["is_paid"]:
            msg = f"Hello {mem['name']}, we have received your payment for the gym subscription! Thank you."
            send_whatsapp_message(mem['phone'], msg)
            
    else:
        flash("Member not found.", "error")
    return redirect(url_for("admin_dashboard"))

@app.route("/admin/update_package", methods=["POST"])
def update_member_package():
    member_id = request.form.get("member_id")
    new_package_id = request.form.get("package_id")
    
    if member_id and new_package_id:
        data = load_data()
        member = next((m for m in data["members"] if m['id'] == member_id), None)
        new_pkg = next((p for p in data["packages"] if p['id'] == new_package_id), None)
        
        if member and new_pkg:
            duration_months = new_pkg.get("duration_months", 1)
            new_end_date = datetime.now(timezone.utc) + timedelta(days=duration_months * 30)
            
            member['package_id'] = new_package_id
            member['end_date'] = new_end_date.isoformat()
            save_data(data)
            
            msg = f"Hello {member['name']}, your package has been updated to {new_pkg['name']}. Your new subscription is valid until {new_end_date.strftime('%b %d, %Y')}."
            send_whatsapp_message(member['phone'], msg)
            flash(f"Updated package for {member['name']}.", "success")
        else:
            flash("Invalid member or package.", "error")
    else:
        flash("Please select both.", "error")
    return redirect(url_for("admin_dashboard"))

# --- QR & ATTENDANCE ROUTES ---

@app.route("/admin/qr/<qr_id>")
def download_qr(qr_id):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    
    return send_file(buf, mimetype='image/png', as_attachment=True, download_name=f"gym_qr_{qr_id}.png")

@app.route("/api/scan_qr", methods=["POST"])
def api_scan_qr():
    """
    Endpoint for React Native Customer App.
    Expects JSON: {"member_id": "xxx", "qr_id": "yyy"}
    """
    req_data = request.get_json()
    if not req_data:
        return jsonify({"error": "Invalid JSON"}), 400
        
    member_id = req_data.get("member_id")
    qr_id = req_data.get("qr_id")
    
    if not member_id or not qr_id:
        return jsonify({"error": "Missing member_id or qr_id"}), 400
        
    data = load_data()
    
    # Validate Member
    member = next((m for m in data["members"] if m['id'] == member_id), None)
    if not member:
        return jsonify({"error": "Member not found"}), 404
        
    if not member.get("is_paid", False):
        return jsonify({"error": "Payment pending. Cannot enter gym."}), 403
        
    # Check Expiration
    try:
        end_date = datetime.fromisoformat(member['end_date'])
        if datetime.now(timezone.utc) > end_date:
            return jsonify({"error": "Subscription expired"}), 403
    except ValueError:
        pass
        
    # Validate QR
    current_year = str(datetime.now(timezone.utc).year)
    valid_qrs = data.get("gym_qrs", {}).get(current_year, {})
    if qr_id not in [valid_qrs.get("primary"), valid_qrs.get("secondary")]:
        return jsonify({"error": "Invalid or expired QR code"}), 400
        
    # Log Attendance
    data.setdefault("attendance", []).append({
        "member_id": member_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "qr_used": qr_id
    })
    save_data(data)
    
    return jsonify({"success": True, "message": "Attendance logged successfully!"}), 200

@app.route("/api/update_profile", methods=["POST"])
def api_update_profile():
    req_data = request.get_json()
    member_id = req_data.get("member_id")
    name = req_data.get("name")
    email = req_data.get("email")
    phone = req_data.get("phone")
    
    if not member_id:
        return jsonify({"error": "Missing member_id"}), 400
        
    if phone and not phone.startswith("94"):
        phone = "94" + phone.lstrip("0")
        
    data = load_data()
    member = next((m for m in data.get("members", []) if m["id"] == member_id), None)
    
    if member:
        if name: member["name"] = name
        if email: member["email"] = email
        if phone: member["phone"] = phone
        save_data(data)
        return jsonify({
            "success": True,
            "name": member["name"],
            "email": member["email"],
            "phone": member["phone"]
        }), 200
    return jsonify({"error": "Member not found"}), 404

@app.route("/api/login", methods=["POST"])
def api_login():
    req_data = request.get_json()
    if not req_data:
        return jsonify({"error": "Invalid JSON"}), 400
        
    email = req_data.get("email")
    password = req_data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
        
    data = load_data()
    member = next((m for m in data.get("members", []) if m.get("email") == email and m.get("password") == password), None)
    
    if member:
        # Get package name
        pkg_name = "Unknown"
        selected_pkg = next((p for p in data.get("packages", []) if p['id'] == member.get("package_id")), None)
        if selected_pkg:
            pkg_name = selected_pkg["name"]
            
        return jsonify({
            "success": True, 
            "member_id": member["id"],
            "name": member["name"],
            "email": member.get("email", ""),
            "phone": member.get("phone", ""),
            "profile_pic_url": member.get("profile_pic_url", ""),
            "package_name": pkg_name,
            "is_paid": member.get("is_paid", False),
            "is_first_login": member.get("is_first_login", True)  # Default to True for old members
        }), 200
    else:
        return jsonify({"error": "Invalid email or password"}), 401

@app.route("/api/set_password", methods=["POST"])
def api_set_password():
    req_data = request.get_json()
    member_id = req_data.get("member_id")
    new_password = req_data.get("new_password")
    
    if not member_id or not new_password:
        return jsonify({"error": "Missing parameters"}), 400
        
    data = load_data()
    member = next((m for m in data.get("members", []) if m["id"] == member_id), None)
    
    if member:
        member["password"] = new_password
        member["is_first_login"] = False
        save_data(data)
        return jsonify({"success": True}), 200
    else:
        return jsonify({"error": "Member not found"}), 404

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0')
