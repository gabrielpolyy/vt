⏺ Here's the generate_highway job payload spec:                                                       
                                                                                                      
  {                                                                                                   
    "type": "generate_highway",                                                                       
    "mp3_url": "https://...",                                                                         
    "name": "Song Title",                                                                             
                                                                                                      
    "description": "Optional description",                                                            
    "sort_order": 0,                                                                                  
    "user_id": "uuid-or-null",                                                                        
                                                                                                      
    "download_max_retries": 3,                                                                        
    "transcription_method": "gpt4o-ctc",                                                              
    "pitch_model": "medium",                                                                          
    "step_size": 10,                                                                                  
    "fmin": 60.0,                                                                                     
    "fmax": 700.0,                                                                                    
    "pitch_min_confidence": 0.3,                                                                      
    "pitch_confidence_threshold": 0.3,                                                                
    "viterbi": true,                                                                                  
    "min_pause_duration_ms": 100                                                                      
  }                                                                                                   
  Field: type                                                                                         
  Required: ✓                                                                                         
  Default: -                                                                                          
  Description: Must be "generate_highway"                                                             
  ────────────────────────────────────────                                                            
  Field: mp3_url                                                                                      
  Required: ✓                                                                                         
  Default: -                                                                                          
  Description: Audio URL (HTTP/HTTPS, YouTube, or Spotify)                                            
  ────────────────────────────────────────                                                            
  Field: name                                                                                         
  Required: ✓                                                                                         
  Default: -                                                                                          
  Description: Exercise display name                                                                  
  ────────────────────────────────────────                                                            
  Field: description                                                                                  
  Required:                                                                                           
  Default: null                                                                                       
  Description: Exercise description                                                                   
  ────────────────────────────────────────                                                            
  Field: sort_order                                                                                   
  Required:                                                                                           
  Default: 0                                                                                          
  Description: Display order in lists                                                                 
  ────────────────────────────────────────                                                            
  Field: user_id                                                                                      
  Required:                                                                                           
  Default: null                                                                                       
  Description: UUID for user-specific exercise, null for global                                       
  ────────────────────────────────────────                                                            
  Field: download_max_retries                                                                         
  Required:                                                                                           
  Default: 3                                                                                          
  Description: Download retry attempts                                                                
  ────────────────────────────────────────                                                            
  Field: transcription_method                                                                         
  Required:                                                                                           
  Default: "gpt4o-ctc"                                                                                
  Description: Transcription backend                                                                  
  ────────────────────────────────────────                                                            
  Field: pitch_model                                                                                  
  Required:                                                                                           
  Default: "medium"                                                                                   
  Description: CREPE model: tiny/small/medium/large/full                                              
  ────────────────────────────────────────                                                            
  Field: step_size                                                                                    
  Required:                                                                                           
  Default: 10                                                                                         
  Description: Pitch extraction step size (ms)                                                        
  ────────────────────────────────────────                                                            
  Field: fmin                                                                                         
  Required:                                                                                           
  Default: 60.0                                                                                       
  Description: Minimum frequency (Hz)                                                                 
  ────────────────────────────────────────                                                            
  Field: fmax                                                                                         
  Required:                                                                                           
  Default: 700.0                                                                                      
  Description: Maximum frequency (Hz)                                                                 
  ────────────────────────────────────────                                                            
  Field: pitch_min_confidence                                                                         
  Required:                                                                                           
  Default: 0.3                                                                                        
  Description: Min confidence for pitch extraction                                                    
  ────────────────────────────────────────                                                            
  Field: pitch_confidence_threshold                                                                   
  Required:                                                                                           
  Default: 0.3                                                                                        
  Description: Confidence threshold for highway generation                                            
  ────────────────────────────────────────                                                            
  Field: viterbi                                                                                      
  Required:                                                                                           
  Default: true                                                                                       
  Description: Use Viterbi decoding for pitch                                                         
  ────────────────────────────────────────                                                            
  Field: min_pause_duration_ms                                                                        
  Required:                                                                                           
  Default: 100                                                                                        
  Description: Minimum gap to detect as pause                                                         
                                                                                                      