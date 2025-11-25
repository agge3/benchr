from models import db, User
from playhouse.migrate import migrate, SqliteMigrator
from peewee import CharField
import secrets

# Create migrator
migrator = SqliteMigrator(db)

# Add password_hash field (nullable for now to not break existing users)
password_hash_field = CharField(max_length=255, null=True)

# Add api_key field
api_key_field = CharField(max_length=64, unique=True, null=True)

# Run migrations
with db.atomic():
    # Add columns
    migrate(
        migrator.add_column('users', 'password_hash', password_hash_field),
        migrator.add_column('users', 'api_key', api_key_field)
    )

print("✓ Added password_hash and api_key columns to users table")

# Generate API keys and set default passwords for existing users
existing_users = User.select()
for user in existing_users:
    updated = False
    
    if not user.password_hash:
        user.password_hash = "changeme123"  # They can change this on first login
        updated = True
        print(f"✓ Set default password for user: {user.username}")
    
    if not user.api_key:
        user.api_key = secrets.token_urlsafe(32)
        updated = True
        print(f"✓ Generated API key for user: {user.username}")
    
    if updated:
        user.save()

print("\n✓ Migration complete!")
print("\nNote: All existing users have default password 'changeme123'")
print("They should change this on first login.")
