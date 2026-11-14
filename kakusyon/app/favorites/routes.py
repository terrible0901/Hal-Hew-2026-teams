# 実装予定の概要（実装済みを示すものではありません）
# ログインユーザーの作品／競売のお気に入り登録・解除・一覧を扱う。
# 作品と競売は分けて管理し、同一対象の重複登録を防ぐ。
# 再出品で旧競売のお気に入りを新競売へ置き換えず、非公開情報への閲覧権限を確認する。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from kakusyon.app import common


@common.app.route('/favorite',methods=['POST'])
def favorite():
    user_id = common.session.get('user_id')
    art_id = common.request.form.get('art_id')

    query = 'INSERT INTO bookmarks (user_id,auction_id) VALUES (%s,%s)'
    params = (user_id,art_id)
    conn = common.connect_sql()
    cursor = conn.cursor()
    cursor.execute(query,params)
    conn.commit
    cursor.close()
    conn.close()
    
    return common.redirect(common.url_for('item_detail', id=art_id))
