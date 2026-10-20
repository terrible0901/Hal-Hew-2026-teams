from WEB.app import common

@common.app.route('/')
def index() :
    # 検索機能
    search = common.request.args.get('search') #HTMLに検索バーに"search"のnameをつけてください
    filter = common.request.args.get('filter') #HTMLにタイムフィルターに"filter"のnameをつけてください

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

    if search :
        query += 'WHERE art.title LIKE %s OR user.disp_name LIKE %s \n'
        params = (f'%{search}%',)

    query += 'ORDER BY remaining_time ASC'
    conn = common.connect_sql()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query, params)
    result = cursor.fetchall()
    cursor.close()
    conn.close()

    return common.render_template('index.html', result=result)



    
@common.app.route('/draw/setup')
def setup() :
    return render_template('setup.html')

@common.app.route('/draw/canvas')
def canvas() :
    time = request.args.get('time')
    theme = request.args.get('theme')
    mode = request.args.get('mode')
    return render_template('canvas.html', time=time, theme=theme, mode=mode)

@common.app.route('/draw/complete')
def complete() :
    return render_template('complete.html')

