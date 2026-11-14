# 実装予定の概要（実装済みを示すものではありません）
# ホームの公開作品・価格・作者表示名・残り時間を一覧表示する。
# 商品詳細・描画・認証・アカウント・検索への導線を用意する。
# 他人の下書き・非公開作品を表示しない。タグAND検索は検索機能と連携する。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from kakusyon.app import common

@common.app.route('/')
def index() :
    search_result = search()
    # Log inチェック
    user_id = common.session.get('user_id')
    if user_id :
        username = common.session.get('username')
        disp_name = common.session.get('disp_name')

        query = '''
        SELECT
            TIMEDIFF(auc.end_time, NOW()) AS remaining_time,
            bids.auction_id,
            art.image_path,
            art.title
        FROM bids
        JOIN auctions AS auc
            ON auc.id = bids.auction_id
        JOIN artworks AS art
            ON art.id = auc.artwork_id
        WHERE bids.user_id = %s
        '''

        params = (user_id)
        conn = common.connect_sql()
        cursor= conn.cursor(dictionary=True)
        cursor.execute(query,params)
        user_bids = cursor.fetchall()
        cursor.close()
        conn.close()


        return common.render_template('index.html', search_result=search_result,log_in=True,username=username,disp_name=disp_name,user_bids=user_bids)
    return common.render_template('index.html',search_result=search_result,log_in=False)
def search() :
    # 検索機能
    search = common.request.args.get('search') #HTMLに検索バーに"search"のnameをつけてください

    query = '''
    SELECT 
        art.id,
        art.title,
        usr.disp_name AS artist_name,
        auc.current_price,
        art.image_path,# TO DO
    # di index handle current bid buat logged user
        art.draw_time,
        auc.end_time,
        TIMEDIFF(auc.end_time, NOW()) AS remaining_time
    FROM artworks as art
    JOIN users as usr
        ON art.artist_id = usr.id
    JOIN auctions AS auc
        ON art.id = auc.artwork_id
    '''
    params = ()
    query += 'WHERE auc.end_time > NOW() '
    if search :
        query += 'AND \n(art.title LIKE %s OR usr.disp_name LIKE %s)\n'
        params = (f'%{search}%',f'%{search}%')

    query += ' ORDER BY end_time ASC'
    conn = common.connect_sql()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query, params)
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return result