import sqlite3
import os

db_path = r"e:\Antigravity projects\Supply_Chain\backend\supplychain.db"
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory")
    rows = cursor.fetchall()
    print(f"Inventory Table ({len(rows)} rows):")
    for row in rows:
        print(row)
    conn.close()
