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
