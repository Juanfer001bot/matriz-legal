import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_IDS = os.getenv("TELEGRAM_CHAT_IDS", "").split(",")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
ALERT_EMAILS = os.getenv("ALERT_EMAILS", "").split(",")

async def send_telegram_alert(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_IDS or not TELEGRAM_CHAT_IDS[0]:
        print("Telegram config is missing, skipping alert.")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    
    async with httpx.AsyncClient() as client:
        for chat_id in TELEGRAM_CHAT_IDS:
            if not chat_id: continue
            payload = {
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML"
            }
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                print(f"Telegram alert sent to {chat_id}")
            except Exception as e:
                print(f"Error sending Telegram alert: {e}")

def send_email_alert(subject: str, message: str):
    if not SMTP_USERNAME or not SMTP_PASSWORD or not ALERT_EMAILS or not ALERT_EMAILS[0]:
        print("Email config is missing, skipping alert.")
        return

    msg = MIMEMultipart()
    msg['From'] = SMTP_USERNAME
    msg['To'] = ", ".join(ALERT_EMAILS)
    msg['Subject'] = subject
    
    msg.attach(MIMEText(message, 'html'))
    
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(SMTP_USERNAME, ALERT_EMAILS, text)
        server.quit()
        print("Email alert sent successfully.")
    except Exception as e:
        print(f"Error sending Email alert: {e}")
