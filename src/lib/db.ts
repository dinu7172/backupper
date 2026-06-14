import mongoose from 'mongoose';

const MONGODB_URI = process.env.DATABASE_URL || '';

if (!MONGODB_URI && process.env.NODE_ENV === 'production') {
  throw new Error(
    'Please define the DATABASE_URL environment variable inside .env.local'
  );
}

interface MongooseGlobal {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections growing exponentially.
declare global {
  // eslint-disable-next-line no-var
  var mongooseGlobal: MongooseGlobal | undefined;
}

async function dbConnect() {
  const uri = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/backupper';
  
  if (!global.mongooseGlobal) {
    global.mongooseGlobal = { conn: null, promise: null };
  }
  
  const cached = global.mongooseGlobal;
  
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      ...(process.env.DATABASE_NAME ? { dbName: process.env.DATABASE_NAME } : {}),
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
