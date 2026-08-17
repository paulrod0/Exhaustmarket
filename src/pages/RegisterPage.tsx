import { SignUp } from '@clerk/clerk-react'

export default function RegisterPage() {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  )
}
