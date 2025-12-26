export function getImageProperties(url: string): Promise<{ width: number, height: number, ratio: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            resolve({
                width: img.width,
                height: img.height,
                ratio: img.width / img.height
            })
        }
        img.onerror = (err) => reject(err)
        img.src = url
    })
}
