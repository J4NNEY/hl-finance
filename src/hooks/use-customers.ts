"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Customer } from "@/types";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .eq("is_deleted", false)
      .order("nama");

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCustomers(data || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCustomers(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchCustomers]);

  return { customers, loading, error, refetch: fetchCustomers };
}

export function useCustomer(id: string) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setCustomer(data);
      }

      setLoading(false);
    };

    if (id) {
      fetchCustomer();
    }
  }, [id, supabase]);

  return { customer, loading, error };
}
