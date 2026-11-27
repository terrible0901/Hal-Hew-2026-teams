
// @ts-check







export const additionalOwnerArtworks = [

  ["20261028", "11-doumae", "doumae", "yuu", "堂前和希"],



  ["20261028", "12-ahogao", "あほ顔", "じゅ", "食べ物"],



  ["20261028", "13-kurage", "くらげ", "佐伯祐介", "動物"],



  ["20261028", "14-hei-wasshoi", "ヘイわっしょい", "佐伯祐介", "食べ物"],



  ["20261028", "15-neko", "ねこ", "ごみ", "動物"],



  ["20261028", "16-rakugaki", "rakugaki", "餅二郎", "食べ物"],



  ["20261028", "17-tomato", "トマト", "佐伯祐介", "食べ物"],



  ["20261028", "18-miffy", "ミッフィ", "じゅ", "食べ物"],



  ["20261029", "19-kabi", "kabi", "rinatira", "free"],



  ["20261029", "20-pika", "pika", "rinatira", "キャラクター"],

].map(([catalogDate, key, title, artist, category]) => ({

  id: `collection-${catalogDate}-${key}`,



  title,



  artist,



  category,



  image: `/artworks/${key}.png`,




  price: 1000,



  bids: 0,




  createdAt: "",



  prompt: category,

}));
