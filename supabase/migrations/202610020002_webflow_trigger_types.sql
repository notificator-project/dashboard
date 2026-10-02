-- Allow scenarios to subscribe to Webflow's supported webhook event types.
begin;

alter table public.webflow_scenarios
  drop constraint if exists webflow_scenarios_trigger_type_check;

alter table public.webflow_scenarios
  add constraint webflow_scenarios_trigger_type_check
  check (trigger_type in (
    'form_submission',
    'site_publish',
    'page_created',
    'page_metadata_updated',
    'page_deleted',
    'ecomm_new_order',
    'ecomm_order_changed',
    'ecomm_inventory_changed',
    'collection_item_created',
    'collection_item_changed',
    'collection_item_deleted',
    'collection_item_published',
    'collection_item_unpublished',
    'comment_created'
  ));

commit;
