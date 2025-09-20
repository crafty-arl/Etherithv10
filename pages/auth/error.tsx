import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function AuthError() {
  const router = useRouter()
  const { error } = router.query

  useEffect(() => {
    // Auto redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  const getErrorMessage = (error: string | string[] | undefined) => {
    if (Array.isArray(error)) error = error[0]
    
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      case 'OAuthSignin':
        return 'Error occurred during sign in with OAuth provider.'
      case 'OAuthCallback':
        return 'Error occurred during OAuth callback.'
      case 'OAuthCreateAccount':
        return 'Could not create OAuth account.'
      case 'EmailCreateAccount':
        return 'Could not create account with email.'
      case 'Callback':
        return 'Error occurred during callback.'
      case 'OAuthAccountNotLinked':
        return 'Email already exists with different provider.'
      case 'EmailSignin':
        return 'Check your email for sign in link.'
      case 'CredentialsSignin':
        return 'Sign in failed. Check your credentials.'
      case 'SessionRequired':
        return 'Please sign in to access this page.'
      default:
        return 'An error occurred during authentication.'
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card error">
        <h1>Authentication Error</h1>
        <div className="error-icon">⚠️</div>
        <p className="error-message">
          {getErrorMessage(error)}
        </p>
        <div className="error-actions">
          <button 
            className="retry-button"
            onClick={() => router.push('/auth/signin')}
          >
            Try Again
          </button>
          <button 
            className="home-button"
            onClick={() => router.push('/')}
          >
            Go Home
          </button>
        </div>
        <p className="auto-redirect">
          You will be redirected to the home page in 5 seconds...
        </p>
      </div>
    </div>
  )
}




