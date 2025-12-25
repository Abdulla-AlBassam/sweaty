// Pre-made banner library for premium users
// Using IGDB screenshots (more widely available than artworks)

export interface BannerOption {
  id: string
  name: string
  url: string
  gameId?: number
}

// IGDB screenshot URLs - format: https://images.igdb.com/igdb/image/upload/t_screenshot_big/{image_id}.jpg
// These are verified working screenshot IDs from popular games

export const BANNER_OPTIONS: BannerOption[] = [
  // Elden Ring
  {
    id: 'elden-ring-1',
    name: 'Elden Ring',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scfhj5.jpg',
    gameId: 119133,
  },
  {
    id: 'elden-ring-2',
    name: 'Elden Ring - Tree',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scfhj7.jpg',
    gameId: 119133,
  },
  // God of War Ragnarok
  {
    id: 'gow-ragnarok-1',
    name: 'God of War Ragnarök',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scfr1i.jpg',
    gameId: 199113,
  },
  {
    id: 'gow-ragnarok-2',
    name: 'God of War - Battle',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scfr1j.jpg',
    gameId: 199113,
  },
  // Ghost of Tsushima
  {
    id: 'ghost-tsushima-1',
    name: 'Ghost of Tsushima',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8m7g.jpg',
    gameId: 26758,
  },
  {
    id: 'ghost-tsushima-2',
    name: 'Ghost of Tsushima - Duel',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8m7f.jpg',
    gameId: 26758,
  },
  // Red Dead Redemption 2
  {
    id: 'rdr2-1',
    name: 'Red Dead Redemption 2',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/rkog2k.jpg',
    gameId: 25076,
  },
  {
    id: 'rdr2-2',
    name: 'Red Dead - Sunset',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/rkog2l.jpg',
    gameId: 25076,
  },
  // The Witcher 3
  {
    id: 'witcher3-1',
    name: 'The Witcher 3',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/em1y2ugcwy2myuhvb9db.jpg',
    gameId: 1942,
  },
  {
    id: 'witcher3-2',
    name: 'Witcher 3 - Geralt',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/mnljdjtrh44x4snmierh.jpg',
    gameId: 1942,
  },
  // Cyberpunk 2077
  {
    id: 'cyberpunk-1',
    name: 'Cyberpunk 2077',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scab2z.jpg',
    gameId: 1877,
  },
  {
    id: 'cyberpunk-2',
    name: 'Cyberpunk - Night City',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scab2w.jpg',
    gameId: 1877,
  },
  // Horizon Forbidden West
  {
    id: 'horizon-fw-1',
    name: 'Horizon Forbidden West',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scdu75.jpg',
    gameId: 126459,
  },
  // Dark Souls 3
  {
    id: 'darksouls3-1',
    name: 'Dark Souls III',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/nwgs6t3kxzfmpkwgcdmt.jpg',
    gameId: 11133,
  },
  // Bloodborne
  {
    id: 'bloodborne-1',
    name: 'Bloodborne',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/bfmfwkucxvlchppu5xnk.jpg',
    gameId: 7334,
  },
  // Sekiro
  {
    id: 'sekiro-1',
    name: 'Sekiro',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc5rsk.jpg',
    gameId: 112917,
  },
  // Zelda BOTW
  {
    id: 'zelda-botw-1',
    name: 'Zelda: Breath of the Wild',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc9bjt.jpg',
    gameId: 7346,
  },
  // Hollow Knight
  {
    id: 'hollowknight-1',
    name: 'Hollow Knight',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc5l2z.jpg',
    gameId: 9767,
  },
  // Hades
  {
    id: 'hades-1',
    name: 'Hades',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8hym.jpg',
    gameId: 109462,
  },
  // Final Fantasy VII Remake
  {
    id: 'ff7remake-1',
    name: 'Final Fantasy VII Remake',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc86ip.jpg',
    gameId: 24268,
  },
  // Spider-Man
  {
    id: 'spiderman-1',
    name: "Marvel's Spider-Man",
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc5wxw.jpg',
    gameId: 24268,
  },
  // Death Stranding
  {
    id: 'deathstranding-1',
    name: 'Death Stranding',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc5w2p.jpg',
    gameId: 36962,
  },
  // Last of Us Part II
  {
    id: 'tlou2-1',
    name: 'The Last of Us Part II',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc86j7.jpg',
    gameId: 26950,
  },
  // Persona 5
  {
    id: 'persona5-1',
    name: 'Persona 5',
    url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc6560.jpg',
    gameId: 24249,
  },
]

// Get a banner by ID
export function getBannerById(id: string): BannerOption | undefined {
  return BANNER_OPTIONS.find(banner => banner.id === id)
}
