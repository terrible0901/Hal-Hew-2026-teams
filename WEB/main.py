from flask import Flask, render_template, request, redirect, url_for, flash
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



    
