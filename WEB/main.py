from flask import Flask, render_template, request
import mysql.connector

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
    search = request.args.get('search')

    query = '''
    SELECT 
        art.title,
        user.disp_name AS artist_name,
        auc.current_price,
        art.image_path,
        auc.end_time,
        TIMEDIFF(auc.end_time, NOW()) AS remaining_time
    FROM artworks as art
    JOIN users as user
        ON art.artist_id = user.id
    JOIN auctions AS auc
        ON art.id = auc.artwork_id
    '''
    params = ()

    if search :
        query += 'WHERE art.title LIKE %s OR user.disp_name LIKE %s \n'
        params = (f'%{search}%',)

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

