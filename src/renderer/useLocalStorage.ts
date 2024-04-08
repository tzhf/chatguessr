export function getLocalStorage<T>(key: string, initialValue: T): T {
  const storedVal = window.localStorage.getItem(key)
  if (storedVal) return isJsonString(storedVal) ? JSON.parse(storedVal) : storedVal
  return initialValue
}

export function setLocalStorage<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function isJsonString(str: string) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}
