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
    
    if not password :
        common.flash("Please fill in the password.", "error")
        return common.redirect(common.url_for("index") + "#signup") #expect bug
    elif password != confirmation :
        common.flash("Passwords do not match. Please try again.", "error")
        return common.redirect(common.url_for("index") + "#signup") #expect bug

    hashed_password = common.generate_password_hash(password)
    conn = common.connect_sql()
    cursor = conn.cursor()
    query = "INSERT INTO users (username, disp_name, password_hash) VALUES (%s,%s,%s)"
    params = ((username,disp_name,hashed_password))
    cursor.execute(query,params)
    conn.commit()
    user_id = cursor.lastrowid
    cursor.close()
    conn.close()
    common.session['user_id'] = user_id
    common.session['username'] = username
    common.session['disp_name'] = disp_name

    common.flash("Account created successfully!", "success")

    return common.redirect(common.url_for("index"))

def username_check(username) :
    conn = common.connect_sql()
    cursor = conn.cursor()
    query = "SELECT username FROM users where username = %s"
    params = (username,)
    cursor.execute(query,params)
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    value = False
    if result :
        value = True
    return value

@common.app.route('/log_in', methods=['POST'])
def log_in() :
    username = common.request.form.get('username')
    password = common.request.form.get('password')

    conn = common.connect_sql()
    cursor = conn.cursor()
    query = 'SELECT id, username, disp_name, password_hash FROM users WHERE username = %s'
    params = (username,)
    cursor.execute(query,params)
    result = cursor.fetchone()
    cursor.close()
    conn.close()

    if (not result) or (not common.check_password_hash(result[3], password)) :
        common.flash("Invalid username or Password", "error")
        return common.redirect(common.url_for("index") + "#login") 

    common.session['user_id'] = result[0]
    common.session['username'] = result[1]
    common.session['disp_name'] = result[2]

    common.flash("Log in success!", "success")
    
    return common.redirect(common.url_for("index"))
        
