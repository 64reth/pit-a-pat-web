// Follow the public play-entry sequence, rather than bypassing mode selection.
export async function enterLocal(page){
 await page.locator('.hero-cta').click();
 await page.getByRole('button',{name:'Local play',exact:true}).click();
}
