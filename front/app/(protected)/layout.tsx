import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'admin_token'

function verifyJwt(token?: string) {
  if (!token) return false

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const payloadJson = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8')
    const payload = JSON.parse(payloadJson)

    const now = Math.floor(Date.now() / 1000)

    return Boolean(payload?.sub && payload?.exp && payload.exp > now)
  } catch {
    return false
  }
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!verifyJwt(token)) {
    redirect('/login')
  }

  return <>{children}</>
}
