// PocketBase v0.25 Collection Setup Script (Updated to Remove Folders)
const PB_URL = process.argv[2] || 'http://127.0.0.1:8090';
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

    // 1. Delete "folders" collection if exists
    console.log('🗑️ Deleting "folders" collection...');
    const delFoldersRes = await fetch(`${PB_URL}/api/collections/folders`, {
        method: 'DELETE',
        headers,
    });
    if (delFoldersRes.ok) {
        console.log('✅ "folders" collection deleted');
    } else {
        const err = await delFoldersRes.text();
        if (err.includes('not found')) {
            console.log('⚠️  "folders" not found, skipping delete');
        } else {
            console.error('❌ Failed to delete folders:', err);
        }
    }

    // 2. Delete "notes" collection if exists
    console.log('🗑️ Deleting "notes" collection...');
    const delNotesRes = await fetch(`${PB_URL}/api/collections/notes`, {
        method: 'DELETE',
        headers,
    });
    if (delNotesRes.ok) {
        console.log('✅ "notes" collection deleted');
    } else {
        const err = await delNotesRes.text();
        if (err.includes('not found')) {
            console.log('⚠️  "notes" not found, skipping delete');
        } else {
            console.error('❌ Failed to delete notes:', err);
        }
    }

    // 3. Create fresh "notes" collection (NO FOLDER RELATION)
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
        console.error('❌ Failed to create notes:', err);
    }

    console.log('\n🎉 Setup complete!\n');
}

main().catch(console.error);
