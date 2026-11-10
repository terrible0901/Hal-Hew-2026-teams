# 実装予定の概要（実装済みを示すものではありません）
# 商品詳細・現在価格・終了日時・入札履歴を表示し、同じ画面内で入札を受け付ける。
# 手動入札の確認・確定、自動入札の上限設定・変更・停止、本人の条件付き出品取消を扱う。
# 価格変動時は再確認、期限到達時は終了・結果確定待ちを表示する。
# 残高・ロック・返還・落札確定の具体的な処理は競売／取消サービスへ委ねる。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

@common.app.route('/item_detail')
def item_detail():
    art_id = request.args.get('id')
    query = '''
    SELECT
        art.id,
        art.category,
        art.title,
        usr.disp_name,
        art.created_at,
        auc.current_price,
        art.image_path,
        art.description,
        TIMEDIFF(auc.end_time,NOW()) AS remaining_time
    FROM artworks as art
    JOIN users as usr
        ON art.artist_id = usr.id
    JOIN auctions as auc
        ON art.id = auc.artwork_id
    
    WHERE art.id = %s
    '''

    params = (art_id,)
    conn = common.connect_sql()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query,params)
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result


@common.app.route('/post_bid', methods=['POST'])
def post_bid():
    art_id = common.request.form.get('art_id')
    bid_amount = common.request.form.get('bid_amount')
    user_id = common.session.get('user_id')
    query = 'INSERT INTO bids (auction_id,bidder_id,bid_amount) VALUES (%s,%s,%s)'
    params = (art_id,user_id,bid_amount)
    conn = common.connect_sql()
    cursor = conn.cursor()
    cursor.execute(query,params)
    conn.commit()
    cursor.close()
    conn.close()
    return redirect(url_for('index'))
    # TO DO
    # di index handle current bid buat logged user