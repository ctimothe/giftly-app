const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wishlist = await prisma.wishlist.findFirst();
    if (wishlist) {
        console.log('WISHLIST_ID:' + wishlist.id);
    } else {
        console.log('NO_WISHLIST_FOUND');
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
