// Pre-made banner library for premium users
// These are curated game artworks from popular titles

export interface BannerOption {
  id: string
  name: string
  url: string
  gameId?: number  // IGDB game ID if applicable
}

// Using IGDB artwork URLs - these are high-quality game promotional images
// Format: https://images.igdb.com/igdb/image/upload/t_1080p/{imageId}.jpg

export const BANNER_OPTIONS: BannerOption[] = [
  // Action/Adventure
  {
    id: 'elden-ring',
    name: 'Elden Ring',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar1e5s.jpg',
    gameId: 119133,
  },
  {
    id: 'zelda-totk',
    name: 'Zelda: Tears of the Kingdom',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar2dhy.jpg',
    gameId: 119388,
  },
  {
    id: 'god-of-war-ragnarok',
    name: 'God of War Ragnarök',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar1g9w.jpg',
    gameId: 119171,
  },
  {
    id: 'ghost-of-tsushima',
    name: 'Ghost of Tsushima',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar10ca.jpg',
    gameId: 26758,
  },
  {
    id: 'horizon-forbidden-west',
    name: 'Horizon Forbidden West',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar14zy.jpg',
    gameId: 126459,
  },
  {
    id: 'red-dead-redemption-2',
    name: 'Red Dead Redemption 2',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar5r8.jpg',
    gameId: 25076,
  },

  // Souls-like / Dark Fantasy
  {
    id: 'dark-souls-3',
    name: 'Dark Souls III',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar5wx.jpg',
    gameId: 11133,
  },
  {
    id: 'sekiro',
    name: 'Sekiro: Shadows Die Twice',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar6x7.jpg',
    gameId: 38050,
  },
  {
    id: 'bloodborne',
    name: 'Bloodborne',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar5wy.jpg',
    gameId: 7334,
  },

  // Sci-Fi
  {
    id: 'cyberpunk-2077',
    name: 'Cyberpunk 2077',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar7ti.jpg',
    gameId: 1877,
  },
  {
    id: 'mass-effect',
    name: 'Mass Effect Legendary',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar10gu.jpg',
    gameId: 131913,
  },
  {
    id: 'starfield',
    name: 'Starfield',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar1pmp.jpg',
    gameId: 96437,
  },
  {
    id: 'halo-infinite',
    name: 'Halo Infinite',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar1bhb.jpg',
    gameId: 119161,
  },

  // RPG / Fantasy
  {
    id: 'witcher-3',
    name: 'The Witcher 3',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar5h2.jpg',
    gameId: 1942,
  },
  {
    id: 'baldurs-gate-3',
    name: "Baldur's Gate 3",
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar1nx1.jpg',
    gameId: 119171,
  },
  {
    id: 'final-fantasy-16',
    name: 'Final Fantasy XVI',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar2bvx.jpg',
    gameId: 205827,
  },
  {
    id: 'persona-5',
    name: 'Persona 5 Royal',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar8px.jpg',
    gameId: 24249,
  },

  // Horror
  {
    id: 'resident-evil-4',
    name: 'Resident Evil 4 Remake',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar1wgg.jpg',
    gameId: 233231,
  },
  {
    id: 'alan-wake-2',
    name: 'Alan Wake 2',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar21js.jpg',
    gameId: 135525,
  },

  // Indie / Artistic
  {
    id: 'hollow-knight',
    name: 'Hollow Knight',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar5wx.jpg',
    gameId: 26758,
  },
  {
    id: 'hades',
    name: 'Hades',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar9nm.jpg',
    gameId: 25657,
  },
  {
    id: 'celeste',
    name: 'Celeste',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar3y7.jpg',
    gameId: 25646,
  },

  // Multiplayer / Competitive
  {
    id: 'apex-legends',
    name: 'Apex Legends',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar7mm.jpg',
    gameId: 114795,
  },
  {
    id: 'valorant',
    name: 'Valorant',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar9sk.jpg',
    gameId: 126459,
  },

  // Nintendo
  {
    id: 'mario-odyssey',
    name: 'Super Mario Odyssey',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar4t4.jpg',
    gameId: 25076,
  },
  {
    id: 'metroid-dread',
    name: 'Metroid Dread',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar1383.jpg',
    gameId: 135480,
  },
  {
    id: 'animal-crossing',
    name: 'Animal Crossing: New Horizons',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar8sl.jpg',
    gameId: 109462,
  },

  // Cozy / Relaxing
  {
    id: 'stardew-valley',
    name: 'Stardew Valley',
    url: 'https://images.igdb.com/igdb/image/upload/t_1080p/xrpmydnu9rpxvxfjkiu7.jpg',
    gameId: 17000,
  },
]

// Get a banner by ID
export function getBannerById(id: string): BannerOption | undefined {
  return BANNER_OPTIONS.find(banner => banner.id === id)
}

// Get banners by category (for filtering in the future)
export function getBannersByCategory(category: string): BannerOption[] {
  // Could implement categorization later
  return BANNER_OPTIONS
}
