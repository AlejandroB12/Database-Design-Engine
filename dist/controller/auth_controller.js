(() => {
  const ACCESS_TOKEN_KEY = 'access_token'
  const REFRESH_TOKEN_KEY = 'refresh_token'

  const loginForm = document.querySelector('form:not(.register-form)')
  const registerForm = document.querySelector('.register-form')

  function saveTokens(tokens, remember) {
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  }

  function showError(form, message) {
    const el = form.querySelector('.form-error')
    el.textContent = message
    el.hidden = false
  }

  function clearError(form) {
    const el = form.querySelector('.form-error')
    el.hidden = true
  }

  function setLoading(button, loading, text) {
    button.disabled = loading
    button.textContent = text
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  async function login(email, password) {
    return ApiClient.post('/auth/login', { email, password })
  }

  async function handleLogin(event) {
    event.preventDefault()
    clearError(loginForm)

    const email = loginForm.querySelector('#email').value.trim()
    const password = loginForm.querySelector('#password').value
    const remember = loginForm.querySelector('#remember').checked
    const button = loginForm.querySelector('.btn-signin')

    if (!isValidEmail(email)) return showError(loginForm, 'Ingresa un correo válido')
    if (!password) return showError(loginForm, 'Ingresa tu contraseña')

    try {
      setLoading(button, true, 'Iniciando sesión...')
      const tokens = await login(email, password)
      saveTokens(tokens, remember)
      window.location.href = '/generador'
    } catch (err) {
      setLoading(button, false, 'Iniciar sesión')
      showError(loginForm, err.message)
    }
  }

  async function handleRegister(event) {
    event.preventDefault()
    clearError(registerForm)

    const firstName = registerForm.querySelector('#reg-name').value.trim()
    const lastName = registerForm.querySelector('#reg-lastname').value.trim()
    const userName = registerForm.querySelector('#reg-username').value.trim()
    const email = registerForm.querySelector('#reg-email').value.trim()
    const password = registerForm.querySelector('#reg-password').value
    const confirm = registerForm.querySelector('#reg-confirm').value
    const terms = registerForm.querySelector('#reg-terms').checked
    const button = registerForm.querySelector('.btn-signin')

    if (!firstName || !lastName) return showError(registerForm, 'Completa tu nombre y apellido')
    if (userName && userName.length < 3) return showError(registerForm, 'El nombre de usuario debe tener al menos 3 caracteres')
    if (!isValidEmail(email)) return showError(registerForm, 'Ingresa un correo válido')
    if (password.length < 8) return showError(registerForm, 'La contraseña debe tener al menos 8 caracteres')
    if (password !== confirm) return showError(registerForm, 'Las contraseñas no coinciden')
    if (!terms) return showError(registerForm, 'Debes aceptar los términos y condiciones')

    try {
      setLoading(button, true, 'Creando cuenta...')
      await ApiClient.post('/auth/register', {
        first_name: firstName,
        last_name: lastName,
        user_name: userName || null,
        email,
        password,
      })
      const tokens = await login(email, password)
      saveTokens(tokens, false)
      window.location.href = '/generador'
    } catch (err) {
      setLoading(button, false, 'Crear cuenta')
      showError(registerForm, err.message)
    }
  }

  loginForm.addEventListener('submit', handleLogin)
  registerForm.addEventListener('submit', handleRegister)
})()
