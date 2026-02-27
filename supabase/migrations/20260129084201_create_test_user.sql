/*
  # Crear usuario de prueba con suscripción premium

  1. Usuario de Prueba
    - Email: test@test.com
    - Contraseña: test123456
    - Suscripción: Premium (activa hasta 2027)

  2. Datos creados
    - Usuario en auth.users
    - Perfil en user_profiles
    - Suscripción premium activa en user_subscriptions

  3. Notas
    - Este usuario tiene acceso completo a todas las funcionalidades
    - La suscripción estará activa hasta enero de 2027
*/

-- Insertar usuario de prueba en auth.users
DO $$
DECLARE
  test_user_id uuid;
  premium_tier_id uuid;
BEGIN
  -- Obtener el ID del tier premium
  SELECT id INTO premium_tier_id FROM subscription_tiers WHERE name = 'premium' LIMIT 1;

  -- Verificar si el usuario ya existe
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@test.com';

  -- Si no existe, crearlo
  IF test_user_id IS NULL THEN
    test_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      test_user_id,
      '00000000-0000-0000-0000-000000000000',
      'test@test.com',
      crypt('test123456', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Usuario de Prueba"}',
      'authenticated',
      'authenticated'
    );

    -- Crear perfil de usuario
    INSERT INTO user_profiles (
      id,
      user_type,
      full_name,
      phone,
      is_verified,
      created_at,
      updated_at
    ) VALUES (
      test_user_id,
      'premium',
      'Usuario de Prueba',
      '+34600000000',
      true,
      now(),
      now()
    );

    -- Crear suscripción premium activa
    INSERT INTO user_subscriptions (
      id,
      user_id,
      tier_id,
      status,
      billing_cycle,
      started_at,
      expires_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      test_user_id,
      premium_tier_id,
      'active',
      'yearly',
      now(),
      '2027-01-29 00:00:00+00',
      now(),
      now()
    );

    RAISE NOTICE 'Usuario de prueba creado exitosamente';
    RAISE NOTICE 'Email: test@test.com';
    RAISE NOTICE 'Password: test123456';
    RAISE NOTICE 'User ID: %', test_user_id;
  ELSE
    RAISE NOTICE 'El usuario test@test.com ya existe con ID: %', test_user_id;
    
    -- Asegurarse de que tenga suscripción premium activa
    IF NOT EXISTS (
      SELECT 1 FROM user_subscriptions 
      WHERE user_id = test_user_id 
      AND status = 'active'
    ) THEN
      INSERT INTO user_subscriptions (
        id,
        user_id,
        tier_id,
        status,
        billing_cycle,
        started_at,
        expires_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        test_user_id,
        premium_tier_id,
        'active',
        'yearly',
        now(),
        '2027-01-29 00:00:00+00',
        now(),
        now()
      )
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE 'Suscripción premium agregada al usuario existente';
    END IF;
  END IF;
END $$;