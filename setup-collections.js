// PocketBase v0.25 Collection Setup Script
const PB_URL = process.argv[2] || 'http://192.168.1.198:8090';
const ADMIN_EMAIL = process.argv[3] || 'ilhandemirel23@gmail.com';
const ADMIN_PASSWORD = process.argv[4] || 'ilhan3130';

async function main() {
    console.log(`\n🔗 Connecting to PocketBase at ${PB_URL}...\n`);

    // Admin login (v0.25 superuser auth)
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (!authRes.ok) {
        console.error('❌ Admin login failed:', await authRes.text());
        process.exit(1);
    }
    const { token } = await authRes.json();
    console.log('✅ Admin login successful\n');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': token,
    };

    // Create "folders" collection
    console.log('📁 Creating "folders" collection...');
    const foldersRes = await fetch(`${PB_URL}/api/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: 'folders',
            type: 'base',
            fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'user_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1 },
                { name: 'created_at', type: 'autodate', onCreate: true, onUpdate: false },
                { name: 'updated_at', type: 'autodate', onCreate: true, onUpdate: true },
            ],
            listRule: '@request.auth.id = user_id',
            viewRule: '@request.auth.id = user_id',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id = user_id',
            deleteRule: '@request.auth.id = user_id',
        }),
    });

    if (foldersRes.ok) {
        console.log('✅ "folders" collection created');
    } else {
        const err = await foldersRes.text();
        if (err.includes('already exists')) {
            console.log('⚠️  "folders" already exists, skipping');
        } else {
            console.error('❌ Failed:', err);
        }
    }

    // Create "notes" collection
    console.log('📝 Creating "notes" collection...');
    const notesRes = await fetch(`${PB_URL}/api/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: 'notes',
            type: 'base',
            fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'content', type: 'json', required: false },
                { name: 'folder_id', type: 'text', required: true },
                { name: 'reminder_date', type: 'date', required: false },
                { name: 'user_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1 },
                { name: 'created_at', type: 'autodate', onCreate: true, onUpdate: false },
                { name: 'updated_at', type: 'autodate', onCreate: true, onUpdate: true },
            ],
            listRule: '@request.auth.id = user_id',
            viewRule: '@request.auth.id = user_id',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id = user_id',
            deleteRule: '@request.auth.id = user_id',
        }),
    });

    if (notesRes.ok) {
        console.log('✅ "notes" collection created');
    } else {
        const err = await notesRes.text();
        if (err.includes('already exists')) {
            console.log('⚠️  "notes" already exists, skipping');
        } else {
            console.error('❌ Failed:', err);
        }
    }

    console.log('\n🎉 Setup complete!\n');
}

main().catch(console.error);
