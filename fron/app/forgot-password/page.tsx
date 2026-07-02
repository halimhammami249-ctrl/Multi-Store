import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-border rounded-lg bg-card p-6">
        <h1 className="text-2xl font-bold text-foreground">Forgot Password</h1>
        <p className="text-muted-foreground mt-3">This feature will be implemented later.</p>
        <Link href="/login" className="inline-block text-primary hover:underline mt-6">
          Back to login
        </Link>
      </div>
    </main>
  )
}
