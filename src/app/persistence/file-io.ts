
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function pickTextFile(accept = '.json'): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept

    const finish = (value: { name: string; text: string } | null) => {
      input.remove()
      resolve(value)
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (file === undefined) return finish(null)
      file.text().then((text) => finish({ name: file.name, text }), () => finish(null))
    })

    input.addEventListener('cancel', () => finish(null))

    input.click()
  })
}