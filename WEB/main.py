from flask import Flask, render_template, request, request, redirect, url_for, flash
from werkzeug.security import generate_password_hash
import mysql.connector, users

app = Flask(__name__)

def connect_sql() :
    return mysql.connector.connect(
        host = "localhost",
        user = "root",
        password = "",
        database = "hew"
    )


@app.route('/')
def index() :
    # 検索機能
    search = request.args.get('search') #HTMLに検索バーに"search"のnameをつけてください
    filter = request.args.get('filter') #HTMLにタイムフィルターに"filter"のnameをつけてください

    query = '''
    SELECT 
        art.title,
        user.disp_name AS artist_name,
        auc.current_price,
        art.image_path,
        art.draw_time,
        auc.end_time,
        TIMEDIFF(auc.end_time, NOW()) AS remaining_time
    FROM artworks as art
    JOIN users as user
        ON art.artist_id = user.id
    JOIN auctions AS auc
        ON art.id = auc.artwork_id
    '''
    params = ()
    if search or filter :
        query += 'WHERE '
    if search :
        query += 'art.title LIKE %s OR user.disp_name LIKE %s \n'
        params = (f'%{search}%',)
        if filter :
            query += 'AND '
    if filter :
        query += 'art.draw_time = %s'
        params += {filter}

    query += 'ORDER BY remaining_time ASC'
    conn = connect_sql()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query, params)
    result = cursor.fetchall()
    cursor.close()
    conn.close()

    return render_template('index.html', result=result)

@app.route('/draw/setup')
def setup() :
    return render_template('setup.html')

@app.route('/draw/canvas')
def canvas() :
    time = request.args.get('time')
    theme = request.args.get('theme')
    mode = request.args.get('mode')
    return render_template('canvas.html', time=time, theme=theme, mode=mode)

@app.route('/draw/complete')
def complete() :
    return render_template('complete.html')

# @app.route('/post_art')
# def post_art() :
#     title = request.args.get('title')
#     artist = request.args.get('artist') #dummy. aslinya pake account info
#     price = request.args.get('price')
#     # img_path = 

    

#     query = "INSERT INTO artworks (title, artist) value"   
#     # TO DO 自分用ノート、気にしないで
#     # dari website cuma ada artist name. V
#     # cari artist ID di user table where artist_name == artist name dari web V
#     # insert artist id dan title ke artworks V 
#     # insert id, artist, price(start_price) ke auctions V
#     # image path masih unknown. harus cari tau krn NOT NULL
#     # current_price coba bikin default = start_price XXXX gk bisa
#     # pahami log in, session


@app.route('/sign_in', methods=['POST']) #signin
def sign_in() :
    # email = request.args.get('email') #いる？要らない？
    password = request.form.get('password')
    confirmation = request.form.get('confirmation')
    # ユーザー名とディスプレイ名追加
    username = request.form.get('username')
    disp_name = request.form.get('display_name')

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
    
