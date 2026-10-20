from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.security import generate_password_hash
from main import connect_sql
import mysql.connector, users

app = Flask(__name__)

@app.route('/sign_in', methods=['POST']) #signin
def sign_in() :
    # email = request.args.get('email') #いる？要らない？
    password = request.form.get('password')
    confirmation = request.form.get('confirmation')
    # ユーザー名とディスプレイ名追加
    username = request.form.get('username')
    disp_name = request.form.get('display_name')

    username_double = username_check(username)
    if username_double :
        flash("Username already taken."),"error"
        return redirect(url_for("index") + "#signin")
    
    if not disp_name :
        disp_name = username
    

    if password != confirmation :
        flash("Passwords do not match. Please try again.", "error")
        return redirect(url_for("index") + "#signin") #新登録もダルへに飛ばす、フロントから対応、後で治す

    hashed_password = generate_password_hash(password)
    conn = connect_sql()
    cursor = conn.cursor()
    query = "INSERT INTO users (username, disp_name, password_hash) VALUES (%s,%s,%s)"
    params = ((username,disp_name,hashed_password))
    cursor.execute(query,params)
    conn.commit()
    cursor.close()
    conn.close()
    # まだリターンしていない。Log inした状態ですすみたいけど、やり方まだわからない
    # belum di return, blom selesai. return dengan account ter login

def username_check(username) :
    conn = connect_sql()
    cursor = conn.cursor()
    query = "SELECT username FROM users where username = %s"
    params = (username,)
    cursor.execute()
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return result

@app.route('\log_in', methods=['POST'])
def log_in() :
    username = request.form.get('username')
    password = request.form.get('password')

    hashed_password = generate_password_hash(password)

    conn = connect_sql()
    cursor = conn.cursor()
    query = 'SELECT username, password_hash FROM users WHERE username = %s'
    params = (username,)
    cursor.execute(query,params)
    result = cursor.fetchone()
    if not result :
        flash("User not found", "error")
        return redirect(url_for("index") + "#login") #Loginもダルへに飛ばす、フロントから対応、後で治す
    if hashed_password != result[1] :
        flash("wrong password", "error")
        return redirect(url_for("index") + "#login") #Loginもダルへに飛ばす、フロントから対応、後で治す

    #これからloginさせる。やり方まだわかんない    
