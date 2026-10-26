# 実装予定の概要（実装済みを示すものではありません）
# ホームの公開作品・価格・作者表示名・残り時間を一覧表示する。
# 商品詳細・描画・認証・アカウント・検索への導線を用意する。
# 他人の下書き・非公開作品を表示しない。タグAND検索は検索機能と連携する。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from kakusyon.app import common

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
        params = (f'%{search}%',f'%{search}%')
        if filter :
            query += 'AND '
    if filter :
        query += 'art.draw_time = %s'
        params += {filter}

    query += 'ORDER BY remaining_time ASC'
    conn = common.connect_sql()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query, params)
    result = cursor.fetchall()
    cursor.close()
    conn.close()

    return common.render_template('index.html', result=result)
