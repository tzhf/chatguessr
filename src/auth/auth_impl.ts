const startAuth: HTMLButtonElement | null = document.querySelector('#start-auth')
if (startAuth) {
  startAuth.addEventListener('click', () => {
    startAuth.disabled = true
    // @ts-expect-error TS2304: defined by preload script
    chatguessrApi.startAuth()
  })
}
