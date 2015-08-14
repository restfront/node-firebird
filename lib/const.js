(function () {
    'use strict';

    var Const = {};

    Const.DEFAULT_ENCODING = 'utf8';
    Const.DEFAULT_FETCHSIZE = 200;

    Const.MAX_INT = Math.pow(2, 31) - 1;
    Const.MIN_INT = -Math.pow(2, 31);

    Const.OP_void = 0;  // Packet has been voided
    Const.OP_connect = 1;  // Connect to remote server
    Const.OP_exit = 2;  // Remote end has exitted
    Const.OP_accept = 3;  // Server accepts connection
    Const.OP_reject = 4;  // Server rejects connection
    Const.OP_disconnect = 6;  // Connect is going away
    Const.OP_response = 9;  // Generic response block

    // Full context server operations
    Const.OP_attach = 19; // Attach database
    Const.OP_create = 20; // Create database
    Const.OP_detach = 21; // Detach database
    Const.OP_compile = 22; // Request based operations
    Const.OP_start = 23;
    Const.OP_start_and_send = 24;
    Const.OP_send = 25;
    Const.OP_receive = 26;
    Const.OP_unwind = 27; // apparently unused; see protocol.cpp's case OP_unwind
    Const.OP_release = 28;

    Const.OP_transaction = 29; // Transaction operations
    Const.OP_commit = 30;
    Const.OP_rollback = 31;
    Const.OP_prepare = 32;
    Const.OP_reconnect = 33;

    Const.OP_create_blob = 34; // Blob operations
    Const.OP_open_blob = 35;
    Const.OP_get_segment = 36;
    Const.OP_put_segment = 37;
    Const.OP_cancel_blob = 38;
    Const.OP_close_blob = 39;

    Const.OP_info_database = 40; // Information services
    Const.OP_info_request = 41;
    Const.OP_info_transaction = 42;
    Const.OP_info_blob = 43;

    Const.OP_batch_segments = 44; // Put a bunch of blob segments

    Const.OP_que_events = 48; // Que event notification request
    Const.OP_cancel_events = 49; // Cancel event notification request
    Const.OP_commit_retaining = 50; // Commit retaining (what else)
    Const.OP_prepare2 = 51; // Message form of prepare
    Const.OP_event = 52; // Completed event request (asynchronous)
    Const.OP_connect_request = 53; // Request to establish connection
    Const.OP_aux_connect = 54; // Establish auxiliary connection
    Const.OP_ddl = 55; // DDL call
    Const.OP_open_blob2 = 56;
    Const.OP_create_blob2 = 57;
    Const.OP_get_slice = 58;
    Const.OP_put_slice = 59;
    Const.OP_slice = 60; // Successful response to op_get_slice
    Const.OP_seek_blob = 61; // Blob seek operation

    // DSQL operations
    Const.OP_allocate_statement = 62; // allocate a statment handle
    Const.OP_execute = 63; // execute a prepared statement
    Const.OP_exec_immediate = 64; // execute a statement
    Const.OP_fetch = 65; // fetch a record
    Const.OP_fetch_response = 66; // response for record fetch
    Const.OP_free_statement = 67; // free a statement
    Const.OP_prepare_statement = 68; // prepare a statement
    Const.OP_set_cursor = 69; // set a cursor name
    Const.OP_info_sql = 70;

    Const.OP_dummy = 71; // dummy packet to detect loss of client
    Const.OP_response_piggyback = 72; // response block for piggybacked messages
    Const.OP_start_and_receive = 73;
    Const.OP_start_send_and_receive = 74;
    Const.OP_exec_immediate2 = 75; // execute an immediate statement with msgs
    Const.OP_execute2 = 76; // execute a statement with msgs
    Const.OP_insert = 77;
    Const.OP_sql_response = 78; // response from execute; exec immed; insert
    Const.OP_transact = 79;
    Const.OP_transact_response = 80;
    Const.OP_drop_database = 81;
    Const.OP_service_attach = 82;
    Const.OP_service_detach = 83;
    Const.OP_service_info = 84;
    Const.OP_service_start = 85;
    Const.OP_rollback_retaining = 86;
    Const.OP_partial = 89; // packet is not complete - delay processing
    Const.OP_trusted_auth = 90;
    Const.OP_cancel = 91;
    Const.OP_cont_auth = 92;
    Const.OP_ping = 93;
    Const.OP_accept_data = 94; // Server accepts connection and returns some data to client
    Const.OP_abort_aux_connection = 95; // Async operation - stop waiting for async connection to arrive
    Const.OP_crypt = 96;
    Const.OP_crypt_key_callback = 97;
    Const.OP_cond_accept = 98; // Server accepts connection; returns some data to client
    // and asks client to continue authentication before attach call


    Const.CONNECT_VERSION2 = 2;
    Const.ARCHITECTURE_GENERIC = 1;


    // Protocol 10 includes support for warnings and removes the requirement for
    // encoding and decoding status codes
    Const.PROTOCOL_VERSION10 = 10;

    // Since protocol 11 we must be separated from Borland Interbase.
    // Therefore always set highmost bit in protocol version to 1.
    // For unsigned protocol version this does not break version's compare.
    Const.FB_PROTOCOL_FLAG = 0x8000;

    // Protocol 11 has support for user authentication related
    // operations (op_update_account_info; op_authenticate_user and
    // op_trusted_auth). When specific operation is not supported;
    // we say "sorry".
    Const.PROTOCOL_VERSION11 = (Const.FB_PROTOCOL_FLAG | 11);

    // Protocol 12 has support for asynchronous call op_cancel.
    // Currently implemented asynchronously only for TCP/IP.
    Const.PROTOCOL_VERSION12 = (Const.FB_PROTOCOL_FLAG | 12);

    // Protocol 13 has support for authentication plugins (op_cont_auth).
    Const.PROTOCOL_VERSION13 = (Const.FB_PROTOCOL_FLAG | 13);


    Const.DSQL_close = 1;
    Const.DSQL_drop = 2;
    Const.DSQL_unprepare = 4; // >= 2.5

    Const.PTYPE_batch_send = 3;

    Const.SQL_TEXT = 452; // Array of char
    Const.SQL_VARYING = 448;
    Const.SQL_SHORT = 500;
    Const.SQL_LONG = 496;
    Const.SQL_FLOAT = 482;
    Const.SQL_DOUBLE = 480;
    Const.SQL_D_FLOAT = 530;
    Const.SQL_TIMESTAMP = 510;
    Const.SQL_BLOB = 520;
    Const.SQL_ARRAY = 540;
    Const.SQL_QUAD = 550;
    Const.SQL_TYPE_TIME = 560;
    Const.SQL_TYPE_DATE = 570;
    Const.SQL_INT64 = 580;
    Const.SQL_BOOLEAN = 32764; // >= 3.0
    Const.SQL_NULL = 32766; // >= 2.5

    /***********************/
    /*   ISC Services      */
    /***********************/
    Const.ISC_action_svc_backup = 1;
    /* Starts database backup process on the server	*/
    Const.ISC_action_svc_restore = 2;
    /* Starts database restore process on the server */
    Const.ISC_action_svc_repair = 3;
    /* Starts database repair process on the server	*/
    Const.ISC_action_svc_add_user = 4;
    /* Adds	a new user to the security database	*/
    Const.ISC_action_svc_delete_user = 5;
    /* Deletes a user record from the security database	*/
    Const.ISC_action_svc_modify_user = 6;
    /* Modifies	a user record in the security database */
    Const.ISC_action_svc_display_user = 7;
    /* Displays	a user record from the security	database */
    Const.ISC_action_svc_properties = 8;
    /* Sets	database properties	*/
    Const.ISC_action_svc_add_license = 9;
    /* Adds	a license to the license file */
    Const.ISC_action_svc_remove_license = 10;
    /* Removes a license from the license file */
    Const.ISC_action_svc_db_stats = 11;
    /* Retrieves database statistics */
    Const.ISC_action_svc_get_ib_log = 12;
    /* Retrieves the InterBase log file	from the server	*/
    Const.ISC_action_svc_get_fb_log = Const.ISC_action_svc_get_ib_log;
    /* Retrieves the Firebird log file	from the server	*/
    Const.ISC_action_svc_nbak = 20;
    /* start nbackup */
    Const.ISC_action_svc_nrest = 21;
    /* start nrestore */
    Const.ISC_action_svc_trace_start = 22;
    Const.ISC_action_svc_trace_stop = 23;
    Const.ISC_action_svc_trace_suspend = 24;
    Const.ISC_action_svc_trace_resume = 25;
    Const.ISC_action_svc_trace_list = 26;
    Const.ISC_action_svc_set_mapping = 27;
    Const.ISC_action_svc_drop_mapping = 28;
    Const.ISC_action_svc_display_user_adm = 29;
    Const.ISC_action_svc_last = 30;


    Const.ISC_info_svc_svr_db_info = 50;
    /* Retrieves the number	of attachments and databases */
    Const.ISC_info_svc_get_license = 51;
    /* Retrieves all license keys and IDs from the license file	*/
    Const.ISC_info_svc_get_license_mask = 52;
    /* Retrieves a bitmask representing	licensed options on	the	server */
    Const.ISC_info_svc_get_config = 53;
    /* Retrieves the parameters	and	values for IB_CONFIG */
    Const.ISC_info_svc_version = 54;
    /* Retrieves the version of	the	services manager */
    Const.ISC_info_svc_server_version = 55;
    /* Retrieves the version of	the	InterBase server */
    Const.ISC_info_svc_implementation = 56;
    /* Retrieves the implementation	of the InterBase server	*/
    Const.ISC_info_svc_capabilities = 57;
    /* Retrieves a bitmask representing	the	server's capabilities */
    Const.ISC_info_svc_user_dbpath = 58;
    /* Retrieves the path to the security database in use by the server	*/
    Const.ISC_info_svc_get_env = 59;
    /* Retrieves the setting of	$INTERBASE */
    Const.ISC_info_svc_get_env_lock = 60;
    /* Retrieves the setting of	$INTERBASE_LCK */
    Const.ISC_info_svc_get_env_msg = 61;
    /* Retrieves the setting of	$INTERBASE_MSG */
    Const.ISC_info_svc_line = 62;
    /* Retrieves 1 line	of service output per call */
    Const.ISC_info_svc_to_eof = 63;
    /* Retrieves as much of	the	server output as will fit in the supplied buffer */
    Const.ISC_info_svc_timeout = 64;
    /* Sets	/ signifies	a timeout value	for	reading	service	information	*/
    Const.ISC_info_svc_get_licensed_users = 65;
    /* Retrieves the number	of users licensed for accessing	the	server */
    Const.ISC_info_svc_limbo_trans = 66;
    /* Retrieve	the	limbo transactions */
    Const.ISC_info_svc_running = 67;
    /* Checks to see if	a service is running on	an attachment */
    Const.ISC_info_svc_get_users = 68;
    /* Returns the user	information	from isc_action_svc_display_users */
    Const.ISC_info_svc_stdin = 78;

    /* Services Properties */
    Const.ISC_spb_prp_page_buffers = 5;
    Const.ISC_spb_prp_sweep_interval = 6;
    Const.ISC_spb_prp_shutdown_db = 7;
    Const.ISC_spb_prp_deny_new_attachments = 9;
    Const.ISC_spb_prp_deny_new_transactions = 10;
    Const.ISC_spb_prp_reserve_space = 11;
    Const.ISC_spb_prp_write_mode = 12;
    Const.ISC_spb_prp_access_mode = 13;
    Const.ISC_spb_prp_set_sql_dialect = 14;
    Const.ISC_spb_num_att = 5;
    Const.ISC_spb_num_db = 6;
    // SHUTDOWN OPTION FOR 2.0
    Const.ISC_spb_prp_force_shutdown = 41;
    Const.ISC_spb_prp_attachments_shutdown = 42;
    Const.ISC_spb_prp_transactions_shutdown = 43;
    Const.ISC_spb_prp_shutdown_mode = 44;
    Const.ISC_spb_prp_online_mode = 45;

    Const.ISC_spb_prp_sm_normal = 0;
    Const.ISC_spb_prp_sm_multi = 1;
    Const.ISC_spb_prp_sm_single = 2;
    Const.ISC_spb_prp_sm_full = 3;


    // WRITE_MODE_PARAMETERS
    Const.ISC_spb_prp_wm_async = 37;
    Const.ISC_spb_prp_wm_sync = 38;

    // ACCESS_MODE_PARAMETERS
    Const.ISC_spb_prp_am_readonly = 39;
    Const.ISC_spb_prp_am_readwrite = 40;

    // RESERVE_SPACE_PARAMETERS
    Const.ISC_spb_prp_res_use_full = 35;
    Const.ISC_spb_prp_res = 36;

    // Option Flags
    Const.ISC_spb_prp_activate = 0x0100;
    Const.ISC_spb_prp_db_online = 0x0200;

    // SHUTDOWN MODE

    /* · Backup Service ·*/
    Const.ISC_spb_bkp_file = 5;
    Const.ISC_spb_bkp_factor = 6;
    Const.ISC_spb_bkp_length = 7;
    Const.ISC_spb_bkp_ignore_checksums = 0x01;
    Const.ISC_spb_bkp_ignore_limbo = 0x02;
    Const.ISC_spb_bkp_metadata_only = 0x04;
    Const.ISC_spb_bkp_no_garbage_collect = 0x08;
    Const.ISC_spb_bkp_old_descriptions = 0x10;
    Const.ISC_spb_bkp_non_transportable = 0x20;
    Const.ISC_spb_bkp_convert = 0x40;
    Const.ISC_spb_bkp_expand = 0x80;
    Const.ISC_spb_bkp_no_triggers = 0x8000;
    // nbackup
    Const.ISC_spb_nbk_level = 5;
    Const.ISC_spb_nbk_file = 6;
    Const.ISC_spb_nbk_direct = 7;
    Const.ISC_spb_nbk_no_triggers = 0x01;

    /*	Restore Service ·*/
    Const.ISC_spb_res_buffers = 9;
    Const.ISC_spb_res_page_size = 10;
    Const.ISC_spb_res_length = 11;
    Const.ISC_spb_res_access_mode = 12;
    Const.ISC_spb_res_fix_fss_data = 13;
    Const.ISC_spb_res_fix_fss_metadata = 14;
    Const.ISC_spb_res_am_readonly = Const.ISC_spb_prp_am_readonly;
    Const.ISC_spb_res_am_readwrite = Const.ISC_spb_prp_am_readwrite;
    Const.ISC_spb_res_deactivate_idx = 0x0100;
    Const.ISC_spb_res_no_shadow = 0x0200;
    Const.ISC_spb_res_no_validity = 0x0400;
    Const.ISC_spb_res_one_at_a_time = 0x0800;
    Const.ISC_spb_res_replace = 0x1000;
    Const.ISC_spb_res_create = 0x2000;
    Const.ISC_spb_res_use_all_space = 0x4000;


    /* · Repair Service ·*/
    Const.ISC_spb_rpr_commit_trans = 15;
    Const.ISC_spb_rpr_rollback_trans = 34;
    Const.ISC_spb_rpr_recover_two_phase = 17;
    Const.ISC_spb_tra_id = 18;
    Const.ISC_spb_single_tra_id = 19;
    Const.ISC_spb_multi_tra_id = 20;
    Const.ISC_spb_tra_state = 21;
    Const.ISC_spb_tra_state_limbo = 22;
    Const.ISC_spb_tra_state_commit = 23;
    Const.ISC_spb_tra_state_rollback = 24;
    Const.ISC_spb_tra_state_unknown = 25;
    Const.ISC_spb_tra_host_site = 26;
    Const.ISC_spb_tra_remote_site = 27;
    Const.ISC_spb_tra_db_path = 28;
    Const.ISC_spb_tra_advise = 29;
    Const.ISC_spb_tra_advise_commit = 30;
    Const.ISC_spb_tra_advise_rollback = 31;
    Const.ISC_spb_tra_advise_unknown = 33;
    Const.ISC_spb_rpr_validate_db = 0x01;
    Const.ISC_spb_rpr_sweep_db = 0x02;
    Const.ISC_spb_rpr_mend_db = 0x04;
    Const.ISC_spb_rpr_list_limbo_trans = 0x08;
    Const.ISC_spb_rpr_check_db = 0x10;
    Const.ISC_spb_rpr_ignore_checksum = 0x20;
    Const.ISC_spb_rpr_kill_shadows = 0x40;
    Const.ISC_spb_rpr_full = 0x80;
    Const.ISC_spb_rpr_icu = 0x0800;

    /* · Security Service ·*/
    Const.ISC_spb_sec_userid = 5;
    Const.ISC_spb_sec_groupid = 6;
    Const.ISC_spb_sec_username = 7;
    Const.ISC_spb_sec_password = 8;
    Const.ISC_spb_sec_groupname = 9;
    Const.ISC_spb_sec_firstname = 10;
    Const.ISC_spb_sec_middlename = 11;
    Const.ISC_spb_sec_lastname = 12;
    Const.ISC_spb_sec_admin = 13;

    /* License Service */
    Const.ISC_spb_lic_key = 5;
    Const.ISC_spb_lic_id = 6;
    Const.ISC_spb_lic_desc = 7;

    /* Statistics Service */
    Const.ISC_spb_sts_data_pages = 0x01;
    Const.ISC_spb_sts_db_log = 0x02;
    Const.ISC_spb_sts_hdr_pages = 0x04;
    Const.ISC_spb_sts_idx_pages = 0x08;
    Const.ISC_spb_sts_sys_relations = 0x10;
    Const.ISC_spb_sts_record_versions = 0x20;
    Const.ISC_spb_sts_table = 0x40;
    Const.ISC_spb_sts_nocreation = 0x80;
    Const.ISC_spb_sts_encryption = 0x100;

    /* Trace Service */
    Const.ISC_spb_trc_id = 1;
    Const.ISC_spb_trc_name = 2;
    Const.ISC_spb_trc_cfg = 3;


    /***********************/
    /*   ISC Error Codes   */
    /***********************/
    Const.ISC_arg_end = 0;  // end of argument list
    Const.ISC_arg_gds = 1;  // generic DSRI status value
    Const.ISC_arg_string = 2;  // string argument
    Const.ISC_arg_cstring = 3;  // count & string argument
    Const.ISC_arg_number = 4;  // numeric argument (long)
    Const.ISC_arg_interpreted = 5;  // interpreted status code (string)
    Const.ISC_arg_unix = 7;  // UNIX error code
    Const.ISC_arg_next_mach = 15; // NeXT/Mach error code
    Const.ISC_arg_win32 = 17; // Win32 error code
    Const.ISC_arg_warning = 18; // warning argument
    Const.ISC_arg_sql_state = 19; // SQLSTATE

    Const.ISC_sqlerr = 335544436;

    /**********************************/
    /* Database parameter block stuff */
    /**********************************/
    Const.ISC_dpb_version1 = 1;
    Const.ISC_dpb_version2 = 2; // >= FB30
    Const.ISC_dpb_cdd_pathname = 1;
    Const.ISC_dpb_allocation = 2;
    Const.ISC_dpb_journal = 3;
    Const.ISC_dpb_page_size = 4;
    Const.ISC_dpb_num_buffers = 5;
    Const.ISC_dpb_buffer_length = 6;
    Const.ISC_dpb_debug = 7;
    Const.ISC_dpb_garbage_collect = 8;
    Const.ISC_dpb_verify = 9;
    Const.ISC_dpb_sweep = 10;
    Const.ISC_dpb_enable_journal = 11;
    Const.ISC_dpb_disable_journal = 12;
    Const.ISC_dpb_dbkey_scope = 13;
    Const.ISC_dpb_number_of_users = 14;
    Const.ISC_dpb_trace = 15;
    Const.ISC_dpb_no_garbage_collect = 16;
    Const.ISC_dpb_damaged = 17;
    Const.ISC_dpb_license = 18;
    Const.ISC_dpb_sys_user_name = 19;
    Const.ISC_dpb_encrypt_key = 20;
    Const.ISC_dpb_activate_shadow = 21;
    Const.ISC_dpb_sweep_interval = 22;
    Const.ISC_dpb_delete_shadow = 23;
    Const.ISC_dpb_force_write = 24;
    Const.ISC_dpb_begin_log = 25;
    Const.ISC_dpb_quit_log = 26;
    Const.ISC_dpb_no_reserve = 27;
    Const.ISC_dpb_user_name = 28;
    Const.ISC_dpb_password = 29;
    Const.ISC_dpb_password_enc = 30;
    Const.ISC_dpb_sys_user_name_enc = 31;
    Const.ISC_dpb_interp = 32;
    Const.ISC_dpb_online_dump = 33;
    Const.ISC_dpb_old_file_size = 34;
    Const.ISC_dpb_old_num_files = 35;
    Const.ISC_dpb_old_file = 36;
    Const.ISC_dpb_old_start_page = 37;
    Const.ISC_dpb_old_start_seqno = 38;
    Const.ISC_dpb_old_start_file = 39;
    Const.ISC_dpb_old_dump_id = 41;
    Const.ISC_dpb_lc_messages = 47;
    Const.ISC_dpb_lc_ctype = 48;
    Const.ISC_dpb_cache_manager = 49;
    Const.ISC_dpb_shutdown = 50;
    Const.ISC_dpb_online = 51;
    Const.ISC_dpb_shutdown_delay = 52;
    Const.ISC_dpb_reserved = 53;
    Const.ISC_dpb_overwrite = 54;
    Const.ISC_dpb_sec_attach = 55;
    Const.ISC_dpb_connect_timeout = 57;
    Const.ISC_dpb_dummy_packet_interval = 58;
    Const.ISC_dpb_gbak_attach = 59;
    Const.ISC_dpb_sql_role_name = 60;
    Const.ISC_dpb_set_page_buffers = 61;
    Const.ISC_dpb_working_directory = 62;
    Const.ISC_dpb_sql_dialect = 63;
    Const.ISC_dpb_set_db_readonly = 64;
    Const.ISC_dpb_set_db_sql_dialect = 65;
    Const.ISC_dpb_gfix_attach = 66;
    Const.ISC_dpb_gstat_attach = 67;
    Const.ISC_dpb_set_db_charset = 68;
    Const.ISC_dpb_gsec_attach = 69;
    Const.ISC_dpb_address_path = 70;
    Const.ISC_dpb_process_id = 71;
    Const.ISC_dpb_no_db_triggers = 72;
    Const.ISC_dpb_trusted_auth = 73;
    Const.ISC_dpb_process_name = 74;
    Const.ISC_dpb_trusted_role = 75;
    Const.ISC_dpb_org_filename = 76;
    Const.ISC_dpb_utf8_filename = 77;
    Const.ISC_dpb_ext_call_depth = 78;

    /*************************************/
    /* Services parameter block stuff    */
    /*************************************/
    Const.ISC_spb_version1 = 1;
    Const.ISC_spb_current_version = 2;
    Const.ISC_spb_version = Const.ISC_spb_current_version;
    Const.ISC_spb_user_name = Const.ISC_dpb_user_name;
    Const.ISC_spb_sys_user_name = Const.ISC_dpb_sys_user_name;
    Const.ISC_spb_sys_user_name_enc = Const.ISC_dpb_sys_user_name_enc;
    Const.ISC_spb_password = Const.ISC_dpb_password;
    Const.ISC_spb_password_enc = Const.ISC_dpb_password_enc;
    Const.ISC_spb_command_line = 105;
    Const.ISC_spb_dbname = 106;
    Const.ISC_spb_verbose = 107;
    Const.ISC_spb_options = 108;

    /*************************************/
    /* Transaction parameter block stuff */
    /*************************************/
    Const.ISC_tpb_version1 = 1;
    Const.ISC_tpb_version3 = 3;
    Const.ISC_tpb_consistency = 1;
    Const.ISC_tpb_concurrency = 2;
    Const.ISC_tpb_shared = 3; // < FB21
    Const.ISC_tpb_protected = 4; // < FB21
    Const.ISC_tpb_exclusive = 5; // < FB21
    Const.ISC_tpb_wait = 6;
    Const.ISC_tpb_nowait = 7;
    Const.ISC_tpb_read = 8;
    Const.ISC_tpb_write = 9;
    Const.ISC_tpb_lock_read = 10;
    Const.ISC_tpb_lock_write = 11;
    Const.ISC_tpb_verb_time = 12;
    Const.ISC_tpb_commit_time = 13;
    Const.ISC_tpb_ignore_limbo = 14;
    Const.ISC_tpb_read_committed = 15;
    Const.ISC_tpb_autocommit = 16;
    Const.ISC_tpb_rec_version = 17;
    Const.ISC_tpb_no_rec_version = 18;
    Const.ISC_tpb_restart_requests = 19;
    Const.ISC_tpb_no_auto_undo = 20;
    Const.ISC_tpb_lock_timeout = 21; // >= FB20

    /****************************/
    /* Common; structural codes */
    /****************************/
    Const.ISC_info_end = 1;
    Const.ISC_info_truncated = 2;
    Const.ISC_info_error = 3;
    Const.ISC_info_data_not_ready = 4;
    Const.ISC_info_length = 126;
    Const.ISC_info_flag_end = 127;

    /*************************/
    /* SQL information items */
    /*************************/
    Const.ISC_info_sql_select = 4;
    Const.ISC_info_sql_bind = 5;
    Const.ISC_info_sql_num_variables = 6;
    Const.ISC_info_sql_describe_vars = 7;
    Const.ISC_info_sql_describe_end = 8;
    Const.ISC_info_sql_sqlda_seq = 9;
    Const.ISC_info_sql_message_seq = 10;
    Const.ISC_info_sql_type = 11;
    Const.ISC_info_sql_sub_type = 12;
    Const.ISC_info_sql_scale = 13;
    Const.ISC_info_sql_length = 14;
    Const.ISC_info_sql_null_ind = 15;
    Const.ISC_info_sql_field = 16;
    Const.ISC_info_sql_relation = 17;
    Const.ISC_info_sql_owner = 18;
    Const.ISC_info_sql_alias = 19;
    Const.ISC_info_sql_sqlda_start = 20;
    Const.ISC_info_sql_stmt_type = 21;
    Const.ISC_info_sql_get_plan = 22;
    Const.ISC_info_sql_records = 23;
    Const.ISC_info_sql_batch_fetch = 24;
    Const.ISC_info_sql_relation_alias = 25; // >= 2.0
    Const.ISC_info_sql_explain_plan = 26; // >= 3.0

    /*******************/
    /* Blr definitions */
    /*******************/
    Const.BLR_text = 14;
    Const.BLR_text2 = 15;
    Const.BLR_short = 7;
    Const.BLR_long = 8;
    Const.BLR_quad = 9;
    Const.BLR_float = 10;
    Const.BLR_double = 27;
    Const.BLR_d_float = 11;
    Const.BLR_timestamp = 35;
    Const.BLR_varying = 37;
    Const.BLR_varying2 = 38;
    Const.BLR_blob = 261;
    Const.BLR_cstring = 40;
    Const.BLR_cstring2 = 41;
    Const.BLR_blob_id = 45;
    Const.BLR_sql_date = 12;
    Const.BLR_sql_time = 13;
    Const.BLR_int64 = 16;
    Const.BLR_blob2 = 17; // >= 2.0
    Const.BLR_domain_name = 18; // >= 2.1
    Const.BLR_domain_name2 = 19; // >= 2.1
    Const.BLR_not_nullable = 20; // >= 2.1
    Const.BLR_column_name = 21; // >= 2.5
    Const.BLR_column_name2 = 22; // >= 2.5
    Const.BLR_bool = 23; // >= 3.0

    Const.BLR_version4 = 4;
    Const.BLR_version5 = 5; // dialect 3
    Const.BLR_eoc = 76;
    Const.BLR_end = 255;

    Const.BLR_assignment = 1;
    Const.BLR_begin = 2;
    Const.BLR_dcl_variable = 3;
    Const.BLR_message = 4;

    Const.ISC_info_sql_stmt_select = 1;
    Const.ISC_info_sql_stmt_insert = 2;
    Const.ISC_info_sql_stmt_update = 3;
    Const.ISC_info_sql_stmt_delete = 4;
    Const.ISC_info_sql_stmt_ddl = 5;
    Const.ISC_info_sql_stmt_get_segment = 6;
    Const.ISC_info_sql_stmt_put_segment = 7;
    Const.ISC_info_sql_stmt_exec_procedure = 8;
    Const.ISC_info_sql_stmt_start_trans = 9;
    Const.ISC_info_sql_stmt_commit = 10;
    Const.ISC_info_sql_stmt_rollback = 11;
    Const.ISC_info_sql_stmt_select_for_upd = 12;
    Const.ISC_info_sql_stmt_set_generator = 13;
    Const.ISC_info_sql_stmt_savepoint = 14;

    Const.ISC_blob_text = 1;

    Const.DESCRIBE = [
        Const.ISC_info_sql_stmt_type,
        Const.ISC_info_sql_select,
        Const.ISC_info_sql_describe_vars,
        Const.ISC_info_sql_sqlda_seq,
        Const.ISC_info_sql_type,
        Const.ISC_info_sql_sub_type,
        Const.ISC_info_sql_scale,
        Const.ISC_info_sql_length,
        Const.ISC_info_sql_field,
        Const.ISC_info_sql_relation,
        //Const.ISC_info_sql_owner,
        Const.ISC_info_sql_alias,
        Const.ISC_info_sql_describe_end,
        Const.ISC_info_sql_bind,
        Const.ISC_info_sql_describe_vars,
        Const.ISC_info_sql_sqlda_seq,
        Const.ISC_info_sql_type,
        Const.ISC_info_sql_sub_type,
        Const.ISC_info_sql_scale,
        Const.ISC_info_sql_length,
        Const.ISC_info_sql_describe_end
    ];

    Const.ISOLATION_READ_UNCOMMITTED =
        [Const.ISC_tpb_version3, Const.ISC_tpb_write, Const.ISC_tpb_wait, Const.ISC_tpb_read_committed, Const.ISC_tpb_rec_version];
    Const.ISOLATION_READ_COMMITED =
        [Const.ISC_tpb_version3, Const.ISC_tpb_write, Const.ISC_tpb_wait, Const.ISC_tpb_read_committed, Const.ISC_tpb_no_rec_version];
    Const.ISOLATION_REPEATABLE_READ =
        [Const.ISC_tpb_version3, Const.ISC_tpb_write, Const.ISC_tpb_wait, Const.ISC_tpb_concurrency];
    Const.ISOLATION_SERIALIZABLE =
        [Const.ISC_tpb_version3, Const.ISC_tpb_write, Const.ISC_tpb_wait, Const.ISC_tpb_consistency];
    Const.ISOLATION_READ_COMMITED_READ_ONLY =
        [Const.ISC_tpb_version3, Const.ISC_tpb_read, Const.ISC_tpb_wait, Const.ISC_tpb_read_committed, Const.ISC_tpb_no_rec_version];
    // read, read_committed, rec_version
    Const.ISOLATION_READ =
        [Const.ISC_tpb_version3, Const.ISC_tpb_read, Const.ISC_tpb_read_committed, Const.ISC_tpb_rec_version];
    // write, nowait; read_committed; rec_version
    Const.ISOLATION_WRITE =
        [Const.ISC_tpb_version3, Const.ISC_tpb_write, Const.ISC_tpb_nowait, Const.ISC_tpb_read_committed, Const.ISC_tpb_rec_version];

    /**
     * @type {Const}
     */
    module.exports = Object.freeze(Const);
})();