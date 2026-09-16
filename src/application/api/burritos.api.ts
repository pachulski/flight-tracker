const BURRITOS_URL = '/api/burritos.json'

// GET /api/burritos.json — returns raw JSON; validation belongs to the consuming feature
export const getBurritos = async (): Promise<unknown> => {
  const response = await fetch(BURRITOS_URL)

  if (!response.ok) {
    throw new Error(
      `GET ${BURRITOS_URL} failed with status ${String(response.status)}`,
    )
  }

  return response.json()
}
