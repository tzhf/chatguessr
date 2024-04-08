// Adapted from:
// https://gitlab.com/nonreviad/extenssr/-/blob/c795a07e0eb64cb5b32d60e6f3784b044becb1c1/src/api/maps.ts
// https://gitlab.com/nonreviad/extenssr/-/blob/c795a07e0eb64cb5b32d60e6f3784b044becb1c1/src/content_scripts/plugins/global/menu_items_plugin.ts
// https://gitlab.com/nonreviad/extenssr/-/blob/c795a07e0eb64cb5b32d60e6f3784b044becb1c1/src/content_scripts/endpoint_transition_handler.ts

import axios from 'axios'

type MapCreator = {
  email?: string
  nick: string
}

type Map = {
  id: string
  name: string
  slug: string
  description?: string
  url?: string
  playUrl?: string
  creator?: MapCreator
}

class MapsApi {
  private client = axios.create({ baseURL: 'https://www.geoguessr.com' })

  async getMapData(mapId: string): Promise<Map> {
    return (await this.client.get<Map>(`/api/maps/${mapId}`)).data
  }

  async getMyMaps(page = 0, count = 25): Promise<Map[]> {
    const { data } = await this.client.get<Map[]>('/api/v3/profiles/maps', {
      params: { page, count }
    })

    return data
  }

  async getLikedMaps(page = 0, count = 25): Promise<Map[]> {
    const { data } = await this.client.get<Map[]>('/api/v3/likes', {
      params: { page, count }
    })

    return data
  }
}

const DESELECTED_MENU_ITEM_SELECTOR = 'header nav li:not([class*="selected"])'

const customMenuItemTemplate = document.createElement('div')
customMenuItemTemplate.append(document.createElement('a'))
Object.assign(customMenuItemTemplate.style, {
  display: 'flex',
  flex: '0 0 auto',
  height: '100%'
})
Object.assign(customMenuItemTemplate.querySelector('a')!.style, {
  color: 'white',
  fontWeight: '700',
  padding: '1rem',
  display: 'block',
  textTransform: 'uppercase'
})

type SubMenuItem = {
  href: string
  textContent: string
}

export default class MenuItemsPlugin {
  private api: MapsApi | undefined
  private myMaps: Map[] | undefined
  private likedMaps: Map[] | undefined
  private observer: MutationObserver | undefined | null
  private initialLoad = true

  constructor() {
    this.api = new MapsApi()
  }

  onEndpointChange(path: string): void {
    // In-game screens have no `<header>` element
    const header = document.querySelector('header')
    if (document.querySelector('[data-qa="extenssr__nav-item"]') || !header) {
      return
    }

    // We might inject before the React tree hydrates, in that case React will remove our
    // injected elements again, so we need to add them back.
    if (this.initialLoad) {
      this.initialLoad = false
      this.observer = new MutationObserver(() => {
        queueMicrotask(() => this.onEndpointChange(path))
      })
      this.observer.observe(header, { childList: true, subtree: true })
    } else if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    const referenceElement =
      (document.querySelector(DESELECTED_MENU_ITEM_SELECTOR) as HTMLLIElement) ??
      customMenuItemTemplate
    const container =
      referenceElement.closest('ol') ??
      document.querySelector('[data-qa="header-current-user-pin"]')?.parentNode

    const createMenuItem = (props: {
      href: string
      textContent: string
      subMenu?: () => Promise<SubMenuItem[]>
    }) => {
      const li = referenceElement.cloneNode(true) as HTMLLIElement
      li.setAttribute('data-qa', 'extenssr__nav-item')

      const { href, textContent } = props
      Object.assign(li.querySelector('a')!, { href, textContent })

      if (props.subMenu) {
        const overflows = [
          container?.parentNode,
          container?.parentNode?.parentNode
        ] as HTMLDivElement[]

        let controller: AbortController | null
        li.addEventListener('mouseenter', () => {
          controller = new AbortController()
          this.showMenu(li, props.subMenu!, controller.signal)
          for (const el of overflows) {
            el.style.overflow = 'visible'
          }
        })
        li.addEventListener('mouseleave', () => {
          controller?.abort()
          controller = null
          li.querySelector('[data-qa="extenssr__nav-submenu"]')?.remove()
          for (const el of overflows) {
            el.style.overflow = ''
          }
        })
      }

      return li
    }

    const communityMaps = createMenuItem({
      href: '/community/maps',
      textContent: 'Community Maps'
    })

    const myMaps = createMenuItem({
      href: '/me/maps',
      textContent: 'My Maps',
      // @ts-expect-error
      subMenu: async () => {
        this.myMaps ??= await this.api?.getMyMaps(0, 25)
        const maps = this.myMaps?.map((map: Map) => ({
          href: map.url,
          textContent: map.name
        }))
        return maps
      }
    })

    const likedMaps = createMenuItem({
      href: '/me/likes',
      textContent: 'Liked Maps',
      // @ts-expect-error
      subMenu: async () => {
        this.likedMaps ??= await this.api?.getLikedMaps(0, 25)
        return this.likedMaps?.map((map: Map) => ({
          href: map.url,
          textContent: map.name
        }))
      }
    })

    if (referenceElement.tagName === 'LI') {
      container?.append(communityMaps, myMaps, likedMaps)
    } else {
      container?.insertBefore(
        likedMaps,
        document.querySelector('[data-qa="header-current-user-pin"]')
      )
      container?.insertBefore(myMaps, likedMaps)
      container?.insertBefore(communityMaps, myMaps)
    }
  }

  private showMenu(
    reference: HTMLElement,
    items: () => Promise<SubMenuItem[]>,
    signal: AbortSignal
  ) {
    const subMenu = document.createElement('ol')
    subMenu.classList.add('extenssr__nav-submenu')
    subMenu.setAttribute('data-qa', 'extenssr__nav-submenu')

    items().then((list) => {
      subMenu.replaceChildren()
      subMenu.append(
        ...list.map((item) => {
          const li = document.createElement('li')
          const a = document.createElement('a')
          Object.assign(a, item)
          li.append(a)
          return li
        })
      )

      if (!signal.aborted) {
        reference.append(subMenu)
      }
    })
  }
}

const plugin = new MenuItemsPlugin()
observeNavigation()

function observeNavigation() {
  const pathChange = () => plugin.onEndpointChange(window.location.pathname)

  const observer = new MutationObserver((mutations: MutationRecord[]) => {
    for (const mutation of mutations) {
      for (const addition of mutation.addedNodes) {
        if (addition.nodeType !== Node.ELEMENT_NODE) {
          continue
        }
        const element = addition as HTMLElement
        if (element && element.getAttribute('property') === 'og:url') {
          pathChange()
          return
        }
      }
    }
  })
  observer.observe(document.head, {
    childList: true,
    subtree: true
  })
  pathChange()
}
