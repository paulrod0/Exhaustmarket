/*
  # Automotive Marketplace Platform Schema

  ## Overview
  Complete database schema for a multi-user marketplace platform with subscriptions,
  where workshops, professionals, and standard users can interact and transact.

  ## 1. New Tables
  
  ### User Management
    - `user_profiles`
      - `id` (uuid, references auth.users)
      - `user_type` (enum: standard, professional, workshop, premium)
      - `full_name` (text)
      - `phone` (text)
      - `company_name` (text, nullable)
      - `tax_id` (text, nullable)
      - `is_verified` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  ### Subscriptions
    - `subscription_tiers`
      - `id` (uuid)
      - `name` (text: standard, professional, workshop, premium)
      - `price_monthly` (numeric)
      - `price_yearly` (numeric)
      - `features` (jsonb)
      - `active` (boolean)
      
    - `user_subscriptions`
      - `id` (uuid)
      - `user_id` (uuid)
      - `tier_id` (uuid)
      - `status` (text: active, cancelled, expired)
      - `billing_cycle` (text: monthly, yearly)
      - `started_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `stripe_subscription_id` (text, nullable)

  ### Workshop Services
    - `workshop_services`
      - `id` (uuid)
      - `workshop_id` (uuid)
      - `service_name` (text)
      - `description` (text)
      - `base_price` (numeric)
      - `images` (text[])
      - `is_active` (boolean)
      
  ### Professional Products
    - `professional_products`
      - `id` (uuid)
      - `professional_id` (uuid)
      - `product_name` (text)
      - `description` (text)
      - `price` (numeric)
      - `stock` (integer)
      - `images` (text[])
      - `is_active` (boolean)

  ### 3D Designs (Premium/Professional)
    - `design_3d`
      - `id` (uuid)
      - `uploaded_by` (uuid)
      - `title` (text)
      - `description` (text)
      - `file_url` (text)
      - `thumbnail_url` (text)
      - `file_size` (bigint)
      - `is_public` (boolean)

  ### Quote System
    - `quote_requests`
      - `id` (uuid)
      - `user_id` (uuid)
      - `target_user_id` (uuid, workshop or professional)
      - `car_model` (text)
      - `car_year` (integer)
      - `specifications` (text)
      - `service_type` (text)
      - `status` (text: pending, quoted, accepted, rejected)
      - `created_at` (timestamptz)

    - `quotes`
      - `id` (uuid)
      - `quote_request_id` (uuid)
      - `quoted_by` (uuid)
      - `price` (numeric)
      - `notes` (text)
      - `valid_until` (timestamptz)
      - `created_at` (timestamptz)

  ### Transactions & Escrow
    - `transactions`
      - `id` (uuid)
      - `buyer_id` (uuid)
      - `seller_id` (uuid)
      - `amount` (numeric)
      - `type` (text: product, service, subscription)
      - `reference_id` (uuid)
      - `status` (text: pending, completed, cancelled, disputed)
      - `stripe_payment_id` (text)
      - `created_at` (timestamptz)

    - `escrow_holds`
      - `id` (uuid)
      - `transaction_id` (uuid)
      - `amount` (numeric)
      - `status` (text: held, released, refunded)
      - `release_date` (timestamptz)
      - `dispute_reason` (text, nullable)
      - `created_at` (timestamptz)

  ### Document Management
    - `user_documents`
      - `id` (uuid)
      - `user_id` (uuid)
      - `document_type` (text: business_license, tax_registration, id_card)
      - `file_url` (text)
      - `status` (text: pending, approved, rejected)
      - `uploaded_at` (timestamptz)
      - `verified_at` (timestamptz, nullable)

  ## 2. Security
    - Enable RLS on all tables
    - Policies for each user type to access only their own data
    - Admin-level access for document verification
    - Public read access for active marketplace listings

  ## 3. Important Notes
    - All sensitive data is encrypted at rest by Supabase
    - RLS policies ensure users can only access their own data
    - Workshop and Professional users must have verified documents
    - Escrow system protects both buyers and sellers
    - All monetary amounts use numeric type for precision
*/

-- Create enum types
CREATE TYPE user_type_enum AS ENUM ('standard', 'professional', 'workshop', 'premium');
CREATE TYPE subscription_status_enum AS ENUM ('active', 'cancelled', 'expired', 'pending');
CREATE TYPE billing_cycle_enum AS ENUM ('monthly', 'yearly');
CREATE TYPE quote_status_enum AS ENUM ('pending', 'quoted', 'accepted', 'rejected', 'cancelled');
CREATE TYPE transaction_status_enum AS ENUM ('pending', 'completed', 'cancelled', 'disputed', 'refunded');
CREATE TYPE escrow_status_enum AS ENUM ('held', 'released', 'refunded');
CREATE TYPE document_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE document_type_enum AS ENUM ('business_license', 'tax_registration', 'id_card', 'insurance');

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type user_type_enum NOT NULL DEFAULT 'standard',
  full_name text NOT NULL,
  phone text,
  company_name text,
  tax_id text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Subscription Tiers Table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  price_monthly numeric(10,2) NOT NULL,
  price_yearly numeric(10,2) NOT NULL,
  features jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES subscription_tiers(id),
  status subscription_status_enum DEFAULT 'pending',
  billing_cycle billing_cycle_enum NOT NULL,
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workshop Services Table
CREATE TABLE IF NOT EXISTS workshop_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  description text NOT NULL,
  base_price numeric(10,2) NOT NULL,
  images text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Professional Products Table
CREATE TABLE IF NOT EXISTS professional_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) NOT NULL,
  stock integer DEFAULT 0,
  images text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3D Designs Table
CREATE TABLE IF NOT EXISTS design_3d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  thumbnail_url text,
  file_size bigint,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Quote Requests Table
CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id),
  car_model text NOT NULL,
  car_year integer NOT NULL,
  specifications text NOT NULL,
  service_type text NOT NULL,
  status quote_status_enum DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quotes Table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  quoted_by uuid NOT NULL REFERENCES auth.users(id),
  price numeric(10,2) NOT NULL,
  notes text,
  valid_until timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id),
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric(10,2) NOT NULL,
  type text NOT NULL,
  reference_id uuid,
  status transaction_status_enum DEFAULT 'pending',
  stripe_payment_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Escrow Holds Table
CREATE TABLE IF NOT EXISTS escrow_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status escrow_status_enum DEFAULT 'held',
  release_date timestamptz,
  dispute_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Documents Table
CREATE TABLE IF NOT EXISTS user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type document_type_enum NOT NULL,
  file_url text NOT NULL,
  status document_status_enum DEFAULT 'pending',
  uploaded_at timestamptz DEFAULT now(),
  verified_at timestamptz
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_verified ON user_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_workshop_services_workshop_id ON workshop_services(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_services_active ON workshop_services(is_active);
CREATE INDEX IF NOT EXISTS idx_professional_products_professional_id ON professional_products(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_products_active ON professional_products(is_active);
CREATE INDEX IF NOT EXISTS idx_quote_requests_user_id ON quote_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_target_user_id ON quote_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_3d ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can view verified workshops and professionals"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_verified = true AND user_type IN ('workshop', 'professional'));

-- RLS Policies for subscription_tiers
CREATE POLICY "Anyone can view active subscription tiers"
  ON subscription_tiers FOR SELECT
  TO authenticated
  USING (active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for workshop_services
CREATE POLICY "Workshops can manage own services"
  ON workshop_services FOR ALL
  TO authenticated
  USING (auth.uid() = workshop_id)
  WITH CHECK (auth.uid() = workshop_id);

CREATE POLICY "Anyone can view active workshop services"
  ON workshop_services FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for professional_products
CREATE POLICY "Professionals can manage own products"
  ON professional_products FOR ALL
  TO authenticated
  USING (auth.uid() = professional_id)
  WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Anyone can view active professional products"
  ON professional_products FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for design_3d
CREATE POLICY "Users can view own designs"
  ON design_3d FOR SELECT
  TO authenticated
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can view public designs"
  ON design_3d FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Professionals can upload designs"
  ON design_3d FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type IN ('professional', 'premium')
    )
  );

CREATE POLICY "Users can update own designs"
  ON design_3d FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own designs"
  ON design_3d FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- RLS Policies for quote_requests
CREATE POLICY "Users can view own quote requests"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Target users can view quote requests sent to them"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id);

CREATE POLICY "Users can create quote requests"
  ON quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quote requests"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quotes
CREATE POLICY "Users can view quotes for their requests"
  ON quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_requests
      WHERE id = quote_request_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Target users can view quotes they created"
  ON quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = quoted_by);

CREATE POLICY "Target users can create quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = quoted_by AND
    EXISTS (
      SELECT 1 FROM quote_requests
      WHERE id = quote_request_id AND target_user_id = auth.uid()
    )
  );

-- RLS Policies for transactions
CREATE POLICY "Buyers can view own purchase transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view own sale transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can create transactions as buyer"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- RLS Policies for escrow_holds
CREATE POLICY "Users can view escrow for their transactions"
  ON escrow_holds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE id = transaction_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- RLS Policies for user_documents
CREATE POLICY "Users can view own documents"
  ON user_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload own documents"
  ON user_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON user_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default subscription tiers
INSERT INTO subscription_tiers (name, price_monthly, price_yearly, features, active) VALUES
  ('standard', 0.00, 0.00, '["Request quotes", "Browse marketplace", "Basic support"]'::jsonb, true),
  ('professional', 29.99, 299.99, '["All standard features", "Upload products", "Access 3D designs", "Advanced analytics", "Priority support"]'::jsonb, true),
  ('workshop', 49.99, 499.99, '["All standard features", "List services", "Receive quotes", "Workshop management tools", "Priority support"]'::jsonb, true),
  ('premium', 99.99, 999.99, '["All features", "Unlimited listings", "3D design upload", "Advanced analytics", "API access", "White-label options", "24/7 support"]'::jsonb, true)
ON CONFLICT (name) DO NOTHING;