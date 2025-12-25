// Pre-made banner library for premium users
// Using SteamGridDB hero images (1920x620)

export interface BannerOption {
  id: string
  name: string
  url: string
}

export const BANNER_OPTIONS: BannerOption[] = [
  {
    id: 'elden-ring',
    name: 'Elden Ring',
    url: 'https://cdn2.steamgriddb.com/hero/5b359e020d0c4726dd6876f6e6500648.png',
  },
  {
    id: 'god-of-war-ragnarok',
    name: 'God of War Ragnarok',
    url: 'https://cdn2.steamgriddb.com/hero/6c73e29b5c799f2bd212a97678a3a197.jpg',
  },
  {
    id: 'ghost-of-tsushima',
    name: 'Ghost of Tsushima',
    url: 'https://cdn2.steamgriddb.com/hero/97fbc7ee9bcb73fe7c08efe8e5d701f0.png',
  },
  {
    id: 'red-dead-redemption-2',
    name: 'Red Dead Redemption 2',
    url: 'https://cdn2.steamgriddb.com/hero/964e7520947a0d3ac39504daea604d83.png',
  },
  {
    id: 'the-witcher-3',
    name: 'The Witcher 3',
    url: 'https://cdn2.steamgriddb.com/hero/4d19b37a2c399deace9082d464930022.png',
  },
  {
    id: 'cyberpunk-2077',
    name: 'Cyberpunk 2077',
    url: 'https://cdn2.steamgriddb.com/hero/09a824a09b7734ea1cfd2f9a34dedbfd.jpg',
  },
  {
    id: 'horizon-forbidden-west',
    name: 'Horizon Forbidden West',
    url: 'https://cdn2.steamgriddb.com/hero/4ef10445b952a8b3c93a9379d581146a.jpg',
  },
  {
    id: 'dark-souls-iii',
    name: 'Dark Souls III',
    url: 'https://cdn2.steamgriddb.com/hero/7da5911f451a4d399d9739416bec1535.jpg',
  },
  {
    id: 'bloodborne',
    name: 'Bloodborne',
    url: 'https://cdn2.steamgriddb.com/hero/7500f543d4d00b34abc82287370d1b5d.jpg',
  },
  {
    id: 'sekiro-shadows-die-twice',
    name: 'Sekiro Shadows Die Twice',
    url: 'https://cdn2.steamgriddb.com/hero/2ee2b71a912ddc28699435eca8bd6486.png',
  },
  {
    id: 'zelda-breath-of-the-wild',
    name: 'Zelda Breath of the Wild',
    url: 'https://cdn2.steamgriddb.com/hero/71d1c0c06e1ab5049644acb5cc69a090.png',
  },
  {
    id: 'hollow-knight',
    name: 'Hollow Knight',
    url: 'https://cdn2.steamgriddb.com/hero/222c44c26a02c54e3a9fd0d895b12df4.png',
  },
  {
    id: 'hades',
    name: 'Hades',
    url: 'https://cdn2.steamgriddb.com/hero/d9ac1fc532da6646901e9b30ba8964dd.png',
  },
  {
    id: 'final-fantasy-vii-remake',
    name: 'Final Fantasy VII Remake',
    url: 'https://cdn2.steamgriddb.com/hero/680a8d55cea7984805c47e807c854f84.png',
  },
  {
    id: 'persona-5',
    name: 'Persona 5',
    url: 'https://cdn2.steamgriddb.com/hero/d346c2bc24a74cc35bc7c84444da4925.jpg',
  },
  {
    id: 'death-stranding',
    name: 'Death Stranding',
    url: 'https://cdn2.steamgriddb.com/hero/384babc3e7faa44cf1ca671b74499c3b.png',
  },
  {
    id: 'the-last-of-us-part-ii',
    name: 'The Last of Us Part II',
    url: 'https://cdn2.steamgriddb.com/hero/43b2dd1c93748297cfbbea4d31247641.png',
  },
  {
    id: 'spider-man-ps5',
    name: 'Spider-Man PS5',
    url: 'https://cdn2.steamgriddb.com/hero/57696f4c6d8a92b1eb18308677a59ca2.png',
  },
  {
    id: 'baldurs-gate-3',
    name: 'Baldurs Gate 3',
    url: 'https://cdn2.steamgriddb.com/hero/282583c8cb71f1be30f6448db7fca6e9.png',
  },
  {
    id: 'starfield',
    name: 'Starfield',
    url: 'https://cdn2.steamgriddb.com/hero/89c62b07ff8cf6421f954d92e43160b1.png',
  },
]

// Get a banner by ID
export function getBannerById(id: string): BannerOption | undefined {
  return BANNER_OPTIONS.find(banner => banner.id === id)
}
