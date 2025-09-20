-- Backfill article summaries for articles that don't have AI-generated summaries
-- This script identifies articles with missing AI summary fields and marks them for processing

-- Create a function to backfill article summaries
CREATE OR REPLACE FUNCTION backfill_article_summaries()
RETURNS JSON AS $$
DECLARE
  updated_count INTEGER := 0;
  total_count INTEGER;
BEGIN
  -- Update articles that have a summary but missing AI-generated fields
  -- This is typically for articles that were fetched but not yet processed by AI
  UPDATE articles 
  SET ai_summary_generated = FALSE
  WHERE (
    (what IS NULL OR what = '') OR
    (impact IS NULL OR impact = '') OR
    (takeaways IS NULL OR takeaways = '') OR
    (why_this_matters IS NULL OR why_this_matters = '')
  )
  AND summary IS NOT NULL 
  AND summary != ''
  AND ai_summary_generated = TRUE; -- Only update articles that were marked as processed

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Mark articles for AI processing if they have content but no summaries
  UPDATE articles 
  SET ai_summary_generated = FALSE
  WHERE (
    summary IS NULL OR summary = ''
  )
  AND (
    content IS NOT NULL AND content != ''
  )
  AND ai_summary_generated = TRUE;

  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;

  -- Count total articles needing processing
  SELECT COUNT(*) INTO total_count
  FROM articles 
  WHERE ai_summary_generated = FALSE
  AND (
    (summary IS NOT NULL AND summary != '') OR
    (content IS NOT NULL AND content != '')
  );

  -- Return summary
  RETURN json_build_object(
    'articles_updated', updated_count,
    'articles_needing_processing', total_count,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION backfill_article_summaries() TO service_role;

-- Execute the function and show results
SELECT backfill_article_summaries();
