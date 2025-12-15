-- Migration: Add 'parcial' column to public.agendamentos
-- Description: Adds a boolean flag to indicate if a schedule allows partial payments.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedules' AND column_name = 'parcial') THEN
        ALTER TABLE public.schedules ADD COLUMN parcial BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
