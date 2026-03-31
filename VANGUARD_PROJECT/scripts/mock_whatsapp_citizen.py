import requests

print("📱 CSMC WhatsApp Citizen Simulator")
print("-----------------------------------")
issue = input("What is your emergency? (e.g., 'There is a massive pothole near Kranti Chowk'): ")

payload = {
    "sender": "Citizen_9822X",
    "text": issue,
    "lat": 19.8732,
    "lng": 75.3262,
    "image_url": "mock_pothole.jpg",
}

response = requests.post("http://localhost:8000/api/wa_webhook", json=payload, timeout=5)

if response.status_code == 200:
    print("✅ Bot Reply: 'Complaint registered. Ticket #CSN-882. Ward Officer Notified. SLA: 48 Hrs.'")
else:
    print(f"❌ Request failed ({response.status_code}): {response.text}")
