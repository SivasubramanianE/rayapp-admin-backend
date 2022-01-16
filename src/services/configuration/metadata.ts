const metadata = [
    {
        name: 'jwtKey',
        envName: 'JWT_TOKEN_KEY',
        description: 'Secret key to encode and verify JWT token.'
    },
    {
        name: 'jwtExpiry',
        envName: 'JWT_TOKEN_EXPIRY',
        description: 'Expiry time for JWT token.'
    },
    {
        name: 'mdbConnectionString',
        envName: 'MONGODB_URL',
        description: 'MongoDB connection URL.'
    }
]

export default metadata;