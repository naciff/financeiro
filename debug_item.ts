
import { listFinancials } from './src/services/db';

async function run() {
    console.log('Fetching financials...');
    const result = await listFinancials({ status: 1 });
    if (result.error) {
        console.error('Error:', result.error);
        return;
    }
    const item = result.data.find((i: any) => i.historico && i.historico.toLowerCase().includes('equatorial'));
    console.log('Item found:', JSON.stringify(item, null, 2));
}

run();
