export function UserList({ users }) {
    if (!users || users.length === 0) {
        return <span>—</span>;
    }

    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {users.map(user => (
                <span key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span
                        style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: user.color
                        }}
                    />
                    {user.name}
                </span>
            ))}
        </div>
    );
}


