import ConfirmSignIn from '@/components/auth/ConfirmSignIn'

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>
}) {
  const { token_hash } = await searchParams
  return <ConfirmSignIn tokenHash={token_hash || ''} />
}
