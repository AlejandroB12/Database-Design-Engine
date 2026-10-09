const ApiClient = (() => {
  async function request(path, options = {}) {
    let response
    try {
      response = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      })
    } catch {
      throw new Error('No se pudo conectar con el servidor')
    }

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const detail = data && data.detail
      if (Array.isArray(detail)) {
        throw new Error(detail.map(item => item.msg).join(' '))
      }
      throw new Error(typeof detail === 'string' ? detail : 'Error inesperado')
    }
    return data
  }

  return {
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  }
})()
