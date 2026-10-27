# 実装予定の概要（実装済みを示すものではありません）
# 描画時間選択・Canvas表示・作者の下書き管理・出品設定を受け付ける。
# サーバー管理の期限・完成で固定したPNGと全レイヤーZIPを受け付け、両方保存して正式保存とする。
# 保存後の加筆・差し替えは不可。保存猶予は60秒で、失敗時の扱いは仕様決定事項に従う。
# 出品は5・10・15・20分（初期値10分）。原寸PNG・ZIPは作者と落札確定済みの落札者だけ取得可能。
# 描画・履歴復元はJavaScript、ファイル検証と業務処理はサービスへ分ける。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from kakusyon.app import common

@common.app.route('/draw/setup')
def setup() :
    return common.render_template('setup.html')

@common.app.route('/draw/canvas')
def canvas() :
    time = common.request.args.get('time')
    theme = common.request.args.get('theme')
    mode = common.request.args.get('mode')
    return common.render_template('canvas.html', time=time, theme=theme, mode=mode)

@common.app.route('/draw/complete')
def complete() :
    return common.render_template('complete.html')

# @app.route('/post_art')
# def post_art() :
#     title = request.args.get('title')
#     artist = request.args.get('artist') #dummy. aslinya pake account info
#     price = request.args.get('price')
#     # img_path = 

    

#     query = "INSERT INTO artworks (title, artist) value"   
#     # TO DO 自分用ノート、気にしないで
#     # dari website cuma ada artist name. V
#     # cari artist ID di user table where artist_name == artist name dari web V
#     # insert artist id dan title ke artworks V 
#     # insert id, artist, price(start_price) ke auctions V
#     # image path masih unknown. harus cari tau krn NOT NULL
#     # current_price coba bikin default = start_price XXXX gk bisa
#     # pahami log in, session
