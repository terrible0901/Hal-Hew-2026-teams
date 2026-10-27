# 実装予定の概要（実装済みを示すものではありません）
# ユーザー名とパスワードによる登録・ログイン・ログアウトを受け付ける。メールは一切使用しない。
# ユーザー名重複・入力検証、パスワード照合、ログイン状態、本人の表示名変更を扱う。
# 復旧コードでの再設定と、現在のパスワード確認付きコード再発行を提供する。
# コードはハッシュ保存し、使用・再発行時に旧コードを無効化する。イベント終了後は新規登録不可。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from kakusyon.app import common

@common.app.route('/sign_up', methods=['POST']) #signup
def sign_up() :
    # email = request.args.get('email') #いる？要らない？
    password = common.request.form.get('password')
    confirmation = common.request.form.get('confirmation')
    # ユーザー名とディスプレイ名追加
    username = common.request.form.get('username')
    disp_name = common.request.form.get('display_name')

    username_double = username_check(username)
    if username_double :
        common.flash("Username already taken.","error")
        return common.redirect(common.url_for("index") + "#signup") #expect bug
    
    if not disp_name :
        disp_name = username
    

    if password != confirmation :
        common.flash("Passwords do not match. Please try again.", "error")
        return common.redirect(common.url_for("index") + "#signup") #expect bug

    hashed_password = common.generate_password_hash(password)
    conn = common.connect_sql()
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
    conn = common.connect_sql()
    cursor = conn.cursor()
    query = "SELECT username FROM users where username = %s"
    params = (username,)
    cursor.execute(query,params)
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result

@common.app.route('\log_in', methods=['POST'])
def log_in() :
    username = common.request.form.get('username')
    password = common.request.form.get('password')

    hashed_password = common.generate_password_hash(password)

    conn = common.connect_sql()
    cursor = conn.cursor()
    query = 'SELECT username, password_hash FROM users WHERE username = %s'
    params = (username,)
    cursor.execute(query,params)
    result = cursor.fetchone()
    if not result :
        common.flash("User not found", "error")
        return common.redirect(common.url_for("index") + "#login") #Loginもダルへに飛ばす、フロントから対応、後で治す
    if hashed_password != result[1] :
        common.flash("wrong password", "error")
        return common.redirect(common.url_for("index") + "#login") #Loginもダルへに飛ばす、フロントから対応、後で治す

    #これからloginさせる。やり方まだわかんない    
