# 実装予定の概要（実装済みを示すものではありません）
# 描画時間選択・Canvas表示・作者の下書き管理・出品設定を受け付ける。
# サーバー管理の期限・完成で固定したPNGと全レイヤーZIPを受け付け、両方保存して正式保存とする。
# 保存後の加筆・差し替えは不可。保存猶予は60秒で、失敗時の扱いは仕様決定事項に従う。
# 出品は5・10・15・20分（初期値10分）。原寸PNG・ZIPは作者と落札確定済みの落札者だけ取得可能。
# 描画・履歴復元はJavaScript、ファイル検証と業務処理はサービスへ分ける。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from flask import jsonify, redirect, render_template, url_for,request,session

from app.common import app,connect_sql
from app.services.image_service import save_image

@app.route('/draw/setup')
def setup() :
    return render_template('draw_setup.html')

@app.route('/draw/canvas')
def canvas() :
    draw_time = request.args.get('time')
    theme = request.args.get('theme')
    draw_mode = request.args.get('mode')
    session['theme'] = theme
    session['draw_time'] = draw_time
    session['draw_mode'] = draw_mode
    if draw_mode == 'pro':
        return render_template('canvas_pro.html')
    elif draw_mode == 'simple':
        return render_template('canvas_simple.html')
    else:
        return render_template('canvas_mode_error.html')

@app.route('/draw/complete')
def complete() :
    return render_template('complete.html')

@app.route('/post_art', methods=['POST'])
def post_art() :
    title = request.form.get('title')
    artist = session.get('username')
    descript = request.form.get('description')
    price = request.args.get('price')
    category = session.get('theme')
    draw_time = session.get('draw_time')
    end_time = request.args.get('end_time')
    
    file = request.files.get("image")
    if not file or file.mimetype != "image/png":
        return jsonify(error="invalid image"), 400
    img_path = save_image(file) 

    conn = connect_sql()
    cursor = conn.cursor()
    try :
        cursor.execute('SELECT id FROM users WHERE username = %s',(artist,))
        row = cursor.fetchone()
        artist_id = None
        if row :
            artist_id = int(row[0])  # pyright: ignore[reportArgumentType]

        cursor.execute('INSERT INTO artworks (title, artist_id, description,image_path,category,draw_time) VALUES(%s,%s,%s,%s,%s,%s)',(title,artist_id,descript,img_path,category,draw_time))
        artwork_id=cursor.lastrowid
        cursor.execute('INSERT INTO auctions (artwork_id,start_price,current_price,end_time) VALUES(%s,%s,%s,%s)',(artwork_id,price,price,end_time))

    except Exception :
        conn.rollback()
        return jsonify(error='db error'),500

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify(ok=True, redirect=url_for('index'))

    # TO DO 自分用ノート、気にしないで
    # image path masih unknown. harus cari tau krn NOT NULL
    # pahami log in, session