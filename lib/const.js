(function () {
    'use strict';

    // Since protocol 11 we must be separated from Borland Interbase.
    // Therefore always set highmost bit in protocol version to 1.
    // For unsigned protocol version this does not break version's compare.
    const FB_PROTOCOL_FLAG = 0x8000;

    const Const = {
        DEFAULT_ENCODING: 'utf8',
        DEFAULT_FETCHSIZE: 200,

        MAX_BUFFER_SIZE: 8192,
        DEFAULT_USER: 'SYSDBA',
        DEFAULT_PASSWORD: 'masterkey',
        DEFAULT_LOWERCASE_KEYS: true,
        DEFAULT_PAGE_SIZE: 4096,
        DEFAULT_SVC_NAME: 'service_mgr',

        MAX_INT: Math.pow(2, 31) - 1,
        MIN_INT: -Math.pow(2, 31),

        OP_void: 0,  // Packet has been voided
        OP_connect: 1,  // Connect to remote server
        OP_exit: 2,  // Remote end has exitted
        OP_accept: 3,  // Server accepts connection
        OP_reject: 4,  // Server rejects connection
        OP_disconnect: 6,  // Connect is going away
        OP_response: 9,  // Generic response block

        // Full context server operations
        OP_attach: 19, // Attach database
        OP_create: 20, // Create database
        OP_detach: 21, // Detach database
        OP_compile: 22, // Request based operations
        OP_start: 23,
        OP_start_and_send: 24,
        OP_send: 25,
        OP_receive: 26,
        OP_unwind: 27, // apparently unused, see protocol.cpp's case OP_unwind
        OP_release: 28,

        OP_transaction: 29, // Transaction operations
        OP_commit: 30,
        OP_rollback: 31,
        OP_prepare: 32,
        OP_reconnect: 33,

        OP_create_blob: 34, // Blob operations
        OP_open_blob: 35,
        OP_get_segment: 36,
        OP_put_segment: 37,
        OP_cancel_blob: 38,
        OP_close_blob: 39,

        OP_info_database: 40, // Information services
        OP_info_request: 41,
        OP_info_transaction: 42,
        OP_info_blob: 43,

        OP_batch_segments: 44, // Put a bunch of blob segments

        OP_que_events: 48, // Que event notification request
        OP_cancel_events: 49, // Cancel event notification request
        OP_commit_retaining: 50, // Commit retaining (what else)
        OP_prepare2: 51, // Message form of prepare
        OP_event: 52, // Completed event request (asynchronous)
        OP_connect_request: 53, // Request to establish connection
        OP_aux_connect: 54, // Establish auxiliary connection
        OP_ddl: 55, // DDL call
        OP_open_blob2: 56,
        OP_create_blob2: 57,
        OP_get_slice: 58,
        OP_put_slice: 59,
        OP_slice: 60, // Successful response to op_get_slice
        OP_seek_blob: 61, // Blob seek operation

        // DSQL operations
        OP_allocate_statement: 62, // allocate a statment handle
        OP_execute: 63, // execute a prepared statement
        OP_exec_immediate: 64, // execute a statement
        OP_fetch: 65, // fetch a record
        OP_fetch_response: 66, // response for record fetch
        OP_free_statement: 67, // free a statement
        OP_prepare_statement: 68, // prepare a statement
        OP_set_cursor: 69, // set a cursor name
        OP_info_sql: 70,

        OP_dummy: 71, // dummy packet to detect loss of client
        OP_response_piggyback: 72, // response block for piggybacked messages
        OP_start_and_receive: 73,
        OP_start_send_and_receive: 74,
        OP_exec_immediate2: 75, // execute an immediate statement with msgs
        OP_execute2: 76, // execute a statement with msgs
        OP_insert: 77,
        OP_sql_response: 78, // response from execute, exec immed, insert
        OP_transact: 79,
        OP_transact_response: 80,
        OP_drop_database: 81,
        OP_service_attach: 82,
        OP_service_detach: 83,
        OP_service_info: 84,
        OP_service_start: 85,
        OP_rollback_retaining: 86,
        OP_partial: 89, // packet is not complete - delay processing
        OP_trusted_auth: 90,
        OP_cancel: 91,
        OP_cont_auth: 92,
        OP_ping: 93,
        OP_accept_data: 94, // Server accepts connection and returns some data to client
        OP_abort_aux_connection: 95, // Async operation - stop waiting for async connection to arrive
        OP_crypt: 96,
        OP_crypt_key_callback: 97,
        OP_cond_accept: 98, // Server accepts connection, returns some data to client
        // and asks client to continue authentication before attach call

        CONNECT_VERSION2: 2,
        ARCHITECTURE_GENERIC: 1,

        // Protocol 10 includes support for warnings and removes the requirement for
        // encoding and decoding status codes
        PROTOCOL_VERSION10: 10,
        // Since protocol 11 we must be separated from Borland Interbase.
        // Therefore always set highmost bit in protocol version to 1.
        // For unsigned protocol version this does not break version's compare.
        FB_PROTOCOL_FLAG,
        // Protocol 11 has support for user authentication related
        // operations (op_update_account_info, op_authenticate_user and
        // op_trusted_auth). When specific operation is not supported,
        // we say "sorry".
        PROTOCOL_VERSION11: (FB_PROTOCOL_FLAG | 11),
        // Protocol 12 has support for asynchronous call op_cancel.
        // Currently implemented asynchronously only for TCP/IP.
        PROTOCOL_VERSION12: (FB_PROTOCOL_FLAG | 12),
        // Protocol 13 has support for authentication plugins (op_cont_auth).
        PROTOCOL_VERSION13: (FB_PROTOCOL_FLAG | 13),

        DSQL_close: 1,
        DSQL_drop: 2,
        DSQL_unprepare: 4, // >= 2.5

        PTYPE_batch_send: 3,

        SQL_TEXT: 452, // Array of char
        SQL_VARYING: 448,
        SQL_SHORT: 500,
        SQL_LONG: 496,
        SQL_FLOAT: 482,
        SQL_DOUBLE: 480,
        SQL_D_FLOAT: 530,
        SQL_TIMESTAMP: 510,
        SQL_BLOB: 520,
        SQL_ARRAY: 540,
        SQL_QUAD: 550,
        SQL_TYPE_TIME: 560,
        SQL_TYPE_DATE: 570,
        SQL_INT64: 580,
        SQL_BOOLEAN: 32764, // >= 3.0
        SQL_NULL: 32766, // >= 2.5

        /***********************/
        /*   ISC Services      */
        /***********************/
        ISC_action_svc_backup: 1,
        /* Starts database backup process on the server	*/
        ISC_action_svc_restore: 2,
        /* Starts database restore process on the server */
        ISC_action_svc_repair: 3,
        /* Starts database repair process on the server	*/
        ISC_action_svc_add_user: 4,
        /* Adds	a new user to the security database	*/
        ISC_action_svc_delete_user: 5,
        /* Deletes a user record from the security database	*/
        ISC_action_svc_modify_user: 6,
        /* Modifies	a user record in the security database */
        ISC_action_svc_display_user: 7,
        /* Displays	a user record from the security	database */
        ISC_action_svc_properties: 8,
        /* Sets	database properties	*/
        ISC_action_svc_add_license: 9,
        /* Adds	a license to the license file */
        ISC_action_svc_remove_license: 10,
        /* Removes a license from the license file */
        ISC_action_svc_db_stats: 11,
        /* Retrieves database statistics */
        ISC_action_svc_get_ib_log: 12,
        /* Retrieves the InterBase log file	from the server	*/
        ISC_action_svc_get_fb_log: 12,
        /* Retrieves the Firebird log file	from the server	*/
        ISC_action_svc_nbak: 20,
        /* start nbackup */
        ISC_action_svc_nrest: 21,
        /* start nrestore */
        ISC_action_svc_trace_start: 22,
        ISC_action_svc_trace_stop: 23,
        ISC_action_svc_trace_suspend: 24,
        ISC_action_svc_trace_resume: 25,
        ISC_action_svc_trace_list: 26,
        ISC_action_svc_set_mapping: 27,
        ISC_action_svc_drop_mapping: 28,
        ISC_action_svc_display_user_adm: 29,
        ISC_action_svc_last: 30,


        ISC_info_svc_svr_db_info: 50,
        /* Retrieves the number	of attachments and databases */
        ISC_info_svc_get_license: 51,
        /* Retrieves all license keys and IDs from the license file	*/
        ISC_info_svc_get_license_mask: 52,
        /* Retrieves a bitmask representing	licensed options on	the	server */
        ISC_info_svc_get_config: 53,
        /* Retrieves the parameters	and	values for IB_CONFIG */
        ISC_info_svc_version: 54,
        /* Retrieves the version of	the	services manager */
        ISC_info_svc_server_version: 55,
        /* Retrieves the version of	the	InterBase server */
        ISC_info_svc_implementation: 56,
        /* Retrieves the implementation	of the InterBase server	*/
        ISC_info_svc_capabilities: 57,
        /* Retrieves a bitmask representing	the	server's capabilities */
        ISC_info_svc_user_dbpath: 58,
        /* Retrieves the path to the security database in use by the server	*/
        ISC_info_svc_get_env: 59,
        /* Retrieves the setting of	$INTERBASE */
        ISC_info_svc_get_env_lock: 60,
        /* Retrieves the setting of	$INTERBASE_LCK */
        ISC_info_svc_get_env_msg: 61,
        /* Retrieves the setting of	$INTERBASE_MSG */
        ISC_info_svc_line: 62,
        /* Retrieves 1 line	of service output per call */
        ISC_info_svc_to_eof: 63,
        /* Retrieves as much of	the	server output as will fit in the supplied buffer */
        ISC_info_svc_timeout: 64,
        /* Sets	/ signifies	a timeout value	for	reading	service	information	*/
        ISC_info_svc_get_licensed_users: 65,
        /* Retrieves the number	of users licensed for accessing	the	server */
        ISC_info_svc_limbo_trans: 66,
        /* Retrieve	the	limbo transactions */
        ISC_info_svc_running: 67,
        /* Checks to see if	a service is running on	an attachment */
        ISC_info_svc_get_users: 68,
        /* Returns the user	information	from isc_action_svc_display_users */
        ISC_info_svc_stdin: 78,

        /* Services Properties */
        ISC_spb_prp_page_buffers: 5,
        ISC_spb_prp_sweep_interval: 6,
        ISC_spb_prp_shutdown_db: 7,
        ISC_spb_prp_deny_new_attachments: 9,
        ISC_spb_prp_deny_new_transactions: 10,
        ISC_spb_prp_reserve_space: 11,
        ISC_spb_prp_write_mode: 12,
        ISC_spb_prp_access_mode: 13,
        ISC_spb_prp_set_sql_dialect: 14,
        ISC_spb_num_att: 5,
        ISC_spb_num_db: 6,
        // SHUTDOWN OPTION FOR 2.0
        ISC_spb_prp_force_shutdown: 41,
        ISC_spb_prp_attachments_shutdown: 42,
        ISC_spb_prp_transactions_shutdown: 43,
        ISC_spb_prp_shutdown_mode: 44,
        ISC_spb_prp_online_mode: 45,

        ISC_spb_prp_sm_normal: 0,
        ISC_spb_prp_sm_multi: 1,
        ISC_spb_prp_sm_single: 2,
        ISC_spb_prp_sm_full: 3,

        // WRITE_MODE_PARAMETERS
        ISC_spb_prp_wm_async: 37,
        ISC_spb_prp_wm_sync: 38,

        // ACCESS_MODE_PARAMETERS
        ISC_spb_prp_am_readonly: 39,
        ISC_spb_prp_am_readwrite: 40,

        // RESERVE_SPACE_PARAMETERS
        ISC_spb_prp_res_use_full: 35,
        ISC_spb_prp_res: 36,

        // Option Flags
        ISC_spb_prp_activate: 0x0100,
        ISC_spb_prp_db_online: 0x0200,

        // SHUTDOWN MODE

        /* · Backup Service ·*/
        ISC_spb_bkp_file: 5,
        ISC_spb_bkp_factor: 6,
        ISC_spb_bkp_length: 7,
        ISC_spb_bkp_ignore_checksums: 0x01,
        ISC_spb_bkp_ignore_limbo: 0x02,
        ISC_spb_bkp_metadata_only: 0x04,
        ISC_spb_bkp_no_garbage_collect: 0x08,
        ISC_spb_bkp_old_descriptions: 0x10,
        ISC_spb_bkp_non_transportable: 0x20,
        ISC_spb_bkp_convert: 0x40,
        ISC_spb_bkp_expand: 0x80,
        ISC_spb_bkp_no_triggers: 0x8000,
        // nbackup
        ISC_spb_nbk_level: 5,
        ISC_spb_nbk_file: 6,
        ISC_spb_nbk_direct: 7,
        ISC_spb_nbk_no_triggers: 0x01,

        /*	Restore Service ·*/
        ISC_spb_res_buffers: 9,
        ISC_spb_res_page_size: 10,
        ISC_spb_res_length: 11,
        ISC_spb_res_access_mode: 12,
        ISC_spb_res_fix_fss_data: 13,
        ISC_spb_res_fix_fss_metadata: 14,
        ISC_spb_res_am_readonly: 39,
        ISC_spb_res_am_readwrite: 40,
        ISC_spb_res_deactivate_idx: 0x0100,
        ISC_spb_res_no_shadow: 0x0200,
        ISC_spb_res_no_validity: 0x0400,
        ISC_spb_res_one_at_a_time: 0x0800,
        ISC_spb_res_replace: 0x1000,
        ISC_spb_res_create: 0x2000,
        ISC_spb_res_use_all_space: 0x4000,


        /* · Repair Service ·*/
        ISC_spb_rpr_commit_trans: 15,
        ISC_spb_rpr_rollback_trans: 34,
        ISC_spb_rpr_recover_two_phase: 17,
        ISC_spb_tra_id: 18,
        ISC_spb_single_tra_id: 19,
        ISC_spb_multi_tra_id: 20,
        ISC_spb_tra_state: 21,
        ISC_spb_tra_state_limbo: 22,
        ISC_spb_tra_state_commit: 23,
        ISC_spb_tra_state_rollback: 24,
        ISC_spb_tra_state_unknown: 25,
        ISC_spb_tra_host_site: 26,
        ISC_spb_tra_remote_site: 27,
        ISC_spb_tra_db_path: 28,
        ISC_spb_tra_advise: 29,
        ISC_spb_tra_advise_commit: 30,
        ISC_spb_tra_advise_rollback: 31,
        ISC_spb_tra_advise_unknown: 33,
        ISC_spb_rpr_validate_db: 0x01,
        ISC_spb_rpr_sweep_db: 0x02,
        ISC_spb_rpr_mend_db: 0x04,
        ISC_spb_rpr_list_limbo_trans: 0x08,
        ISC_spb_rpr_check_db: 0x10,
        ISC_spb_rpr_ignore_checksum: 0x20,
        ISC_spb_rpr_kill_shadows: 0x40,
        ISC_spb_rpr_full: 0x80,
        ISC_spb_rpr_icu: 0x0800,

        /* · Security Service ·*/
        ISC_spb_sec_userid: 5,
        ISC_spb_sec_groupid: 6,
        ISC_spb_sec_username: 7,
        ISC_spb_sec_password: 8,
        ISC_spb_sec_groupname: 9,
        ISC_spb_sec_firstname: 10,
        ISC_spb_sec_middlename: 11,
        ISC_spb_sec_lastname: 12,
        ISC_spb_sec_admin: 13,

        /* License Service */
        ISC_spb_lic_key: 5,
        ISC_spb_lic_id: 6,
        ISC_spb_lic_desc: 7,

        /* Statistics Service */
        ISC_spb_sts_data_pages: 0x01,
        ISC_spb_sts_db_log: 0x02,
        ISC_spb_sts_hdr_pages: 0x04,
        ISC_spb_sts_idx_pages: 0x08,
        ISC_spb_sts_sys_relations: 0x10,
        ISC_spb_sts_record_versions: 0x20,
        ISC_spb_sts_table: 0x40,
        ISC_spb_sts_nocreation: 0x80,
        ISC_spb_sts_encryption: 0x100,

        /* Trace Service */
        ISC_spb_trc_id: 1,
        ISC_spb_trc_name: 2,
        ISC_spb_trc_cfg: 3,


        /***********************/
        /*   ISC Error Codes   */
        /***********************/
        ISC_arg_end: 0,  // end of argument list
        ISC_arg_gds: 1,  // generic DSRI status value
        ISC_arg_string: 2,  // string argument
        ISC_arg_cstring: 3,  // count & string argument
        ISC_arg_number: 4,  // numeric argument (long)
        ISC_arg_interpreted: 5,  // interpreted status code (string)
        ISC_arg_unix: 7,  // UNIX error code
        ISC_arg_next_mach: 15, // NeXT/Mach error code
        ISC_arg_win32: 17, // Win32 error code
        ISC_arg_warning: 18, // warning argument
        ISC_arg_sql_state: 19, // SQLSTATE

        ISC_sqlerr: 335544436,

        /**********************************/
        /* Database parameter block stuff */
        /**********************************/
        ISC_dpb_version1: 1,
        ISC_dpb_version2: 2, // >= FB30
        ISC_dpb_cdd_pathname: 1,
        ISC_dpb_allocation: 2,
        ISC_dpb_journal: 3,
        ISC_dpb_page_size: 4,
        ISC_dpb_num_buffers: 5,
        ISC_dpb_buffer_length: 6,
        ISC_dpb_debug: 7,
        ISC_dpb_garbage_collect: 8,
        ISC_dpb_verify: 9,
        ISC_dpb_sweep: 10,
        ISC_dpb_enable_journal: 11,
        ISC_dpb_disable_journal: 12,
        ISC_dpb_dbkey_scope: 13,
        ISC_dpb_number_of_users: 14,
        ISC_dpb_trace: 15,
        ISC_dpb_no_garbage_collect: 16,
        ISC_dpb_damaged: 17,
        ISC_dpb_license: 18,
        ISC_dpb_sys_user_name: 19,
        ISC_dpb_encrypt_key: 20,
        ISC_dpb_activate_shadow: 21,
        ISC_dpb_sweep_interval: 22,
        ISC_dpb_delete_shadow: 23,
        ISC_dpb_force_write: 24,
        ISC_dpb_begin_log: 25,
        ISC_dpb_quit_log: 26,
        ISC_dpb_no_reserve: 27,
        ISC_dpb_user_name: 28,
        ISC_dpb_password: 29,
        ISC_dpb_password_enc: 30,
        ISC_dpb_sys_user_name_enc: 31,
        ISC_dpb_interp: 32,
        ISC_dpb_online_dump: 33,
        ISC_dpb_old_file_size: 34,
        ISC_dpb_old_num_files: 35,
        ISC_dpb_old_file: 36,
        ISC_dpb_old_start_page: 37,
        ISC_dpb_old_start_seqno: 38,
        ISC_dpb_old_start_file: 39,
        ISC_dpb_old_dump_id: 41,
        ISC_dpb_lc_messages: 47,
        ISC_dpb_lc_ctype: 48,
        ISC_dpb_cache_manager: 49,
        ISC_dpb_shutdown: 50,
        ISC_dpb_online: 51,
        ISC_dpb_shutdown_delay: 52,
        ISC_dpb_reserved: 53,
        ISC_dpb_overwrite: 54,
        ISC_dpb_sec_attach: 55,
        ISC_dpb_connect_timeout: 57,
        ISC_dpb_dummy_packet_interval: 58,
        ISC_dpb_gbak_attach: 59,
        ISC_dpb_sql_role_name: 60,
        ISC_dpb_set_page_buffers: 61,
        ISC_dpb_working_directory: 62,
        ISC_dpb_sql_dialect: 63,
        ISC_dpb_set_db_readonly: 64,
        ISC_dpb_set_db_sql_dialect: 65,
        ISC_dpb_gfix_attach: 66,
        ISC_dpb_gstat_attach: 67,
        ISC_dpb_set_db_charset: 68,
        ISC_dpb_gsec_attach: 69,
        ISC_dpb_address_path: 70,
        ISC_dpb_process_id: 71,
        ISC_dpb_no_db_triggers: 72,
        ISC_dpb_trusted_auth: 73,
        ISC_dpb_process_name: 74,
        ISC_dpb_trusted_role: 75,
        ISC_dpb_org_filename: 76,
        ISC_dpb_utf8_filename: 77,
        ISC_dpb_ext_call_depth: 78,

        /*************************************/
        /* Events parameter block stuff      */
        /*************************************/
        P_REQ_async: 1,	// Auxiliary asynchronous port
        EPB_version1: 1,

        /*************************************/
        /* Services parameter block stuff    */
        /*************************************/
        ISC_spb_version1: 1,
        ISC_spb_current_version: 2,
        ISC_spb_version: 2,
        ISC_spb_user_name: 28,
        ISC_spb_sys_user_name: 19,
        ISC_spb_sys_user_name_enc: 31,
        ISC_spb_password: 29,
        ISC_spb_password_enc: 30,
        ISC_spb_command_line: 105,
        ISC_spb_dbname: 106,
        ISC_spb_verbose: 107,
        ISC_spb_options: 108,

        /*************************************/
        /* Transaction parameter block stuff */
        /*************************************/
        ISC_tpb_version1: 1,
        ISC_tpb_version3: 3,
        ISC_tpb_consistency: 1,
        ISC_tpb_concurrency: 2,
        ISC_tpb_shared: 3, // < FB21
        ISC_tpb_protected: 4, // < FB21
        ISC_tpb_exclusive: 5, // < FB21
        ISC_tpb_wait: 6,
        ISC_tpb_nowait: 7,
        ISC_tpb_read: 8,
        ISC_tpb_write: 9,
        ISC_tpb_lock_read: 10,
        ISC_tpb_lock_write: 11,
        ISC_tpb_verb_time: 12,
        ISC_tpb_commit_time: 13,
        ISC_tpb_ignore_limbo: 14,
        ISC_tpb_read_committed: 15,
        ISC_tpb_autocommit: 16,
        ISC_tpb_rec_version: 17,
        ISC_tpb_no_rec_version: 18,
        ISC_tpb_restart_requests: 19,
        ISC_tpb_no_auto_undo: 20,
        ISC_tpb_lock_timeout: 21, // >= FB20

        /****************************/
        /* Common, structural codes */
        /****************************/
        ISC_info_end: 1,
        ISC_info_truncated: 2,
        ISC_info_error: 3,
        ISC_info_data_not_ready: 4,
        ISC_info_length: 126,
        ISC_info_flag_end: 127,

        /*************************/
        /* SQL information items */
        /*************************/
        ISC_info_sql_select: 4,
        ISC_info_sql_bind: 5,
        ISC_info_sql_num_variables: 6,
        ISC_info_sql_describe_vars: 7,
        ISC_info_sql_describe_end: 8,
        ISC_info_sql_sqlda_seq: 9,
        ISC_info_sql_message_seq: 10,
        ISC_info_sql_type: 11,
        ISC_info_sql_sub_type: 12,
        ISC_info_sql_scale: 13,
        ISC_info_sql_length: 14,
        ISC_info_sql_null_ind: 15,
        ISC_info_sql_field: 16,
        ISC_info_sql_relation: 17,
        ISC_info_sql_owner: 18,
        ISC_info_sql_alias: 19,
        ISC_info_sql_sqlda_start: 20,
        ISC_info_sql_stmt_type: 21,
        ISC_info_sql_get_plan: 22,
        ISC_info_sql_records: 23,
        ISC_info_sql_batch_fetch: 24,
        ISC_info_sql_relation_alias: 25, // >= 2.0
        ISC_info_sql_explain_plan: 26, // >= 3.0

        /*******************/
        /* Blr definitions */
        /*******************/
        BLR_inner: 0,
        BLR_left: 1,
        BLR_right: 2,
        BLR_full: 3,

        BLR_gds_code: 0,
        BLR_sql_code: 1,
        BLR_exception: 2,
        BLR_trigger_code: 3,
        BLR_default_code: 4,
        BLR_raise: 5,
        BLR_exception_msg: 6,

        BLR_version4: 4,
        BLR_version5: 5, // dialect 3
        BLR_eoc: 76,
        BLR_end: 255,

        BLR_assignment: 1,
        BLR_begin: 2,
        BLR_dcl_variable: 3,
        BLR_message: 4,
        BLR_erase: 5,
        BLR_fetch: 6,
        BLR_for: 7,
        BLR_if: 8,
        BLR_loop: 9,
        BLR_modify: 10,
        BLR_handler: 11,
        BLR_receive: 12,
        BLR_select: 13,
        BLR_send: 14,
        BLR_store: 15,
        BLR_label: 17,
        BLR_leave: 18,
        BLR_store2: 19,
        BLR_post: 20,
        BLR_literal: 21,
        BLR_dbkey: 22,
        BLR_field: 23,
        BLR_fid: 24,
        BLR_parameter: 25,
        BLR_variable: 26,
        BLR_average: 27,
        BLR_count: 28,
        BLR_maximum: 29,
        BLR_minimum: 30,
        BLR_total: 31,
        BLR_add: 34,
        BLR_subtract: 35,
        BLR_multiply: 36,
        BLR_divide: 37,
        BLR_negate: 38,
        BLR_concatenate: 39,
        BLR_substring: 40,
        BLR_parameter2: 41,
        BLR_from: 42,
        BLR_via: 43,
        BLR_parameter2_old: 44,
        BLR_user_name: 44,
        BLR_null: 45,
        BLR_equiv: 46,
        BLR_eql: 47,
        BLR_neq: 48,
        BLR_gtr: 49,
        BLR_geq: 50,
        BLR_lss: 51,
        BLR_leq: 52,
        BLR_containing: 53,
        BLR_matching: 54,
        BLR_starting: 55,
        BLR_between: 56,
        BLR_or: 57,
        BLR_and: 58,
        BLR_not: 59,
        BLR_any: 60,
        BLR_missing: 61,
        BLR_unique: 62,
        BLR_like: 63,
        BLR_rse: 67,
        BLR_first: 68,
        BLR_project: 69,
        BLR_sort: 70,
        BLR_boolean: 71,
        BLR_ascending: 72,
        BLR_descending: 73,
        BLR_relation: 74,
        BLR_rid: 75,
        BLR_union: 76,
        BLR_map: 77,
        BLR_group_by: 78,
        BLR_aggregate: 79,
        BLR_join_type: 80,
        BLR_agg_count: 83,
        BLR_agg_max: 84,
        BLR_agg_min: 85,
        BLR_agg_total: 86,
        BLR_agg_average: 87,
        BLR_parameter3: 88,
        BLR_run_max: 89,
        BLR_run_min: 90,
        BLR_run_total: 91,
        BLR_run_average: 92,
        BLR_agg_count2: 93,
        BLR_agg_count_distinct: 94,
        BLR_agg_total_distinct: 95,
        BLR_agg_average_distinct: 96,
        BLR_function: 100,
        BLR_gen_id: 101,
        BLR_prot_mask: 102,
        BLR_upcase: 103,
        BLR_lock_state: 104,
        BLR_value_if: 105,
        BLR_matching2: 106,
        BLR_index: 107,
        BLR_ansi_like: 108,
        BLR_seek: 112,

        BLR_continue: 0,
        BLR_forward: 1,
        BLR_backward: 2,
        BLR_bof_forward: 3,
        BLR_eof_backward: 4,

        BLR_run_count: 118,
        BLR_rs_stream: 119,
        BLR_exec_proc: 120,
        BLR_procedure: 124,
        BLR_pid: 125,
        BLR_exec_pid: 126,
        BLR_singular: 127,
        BLR_abort: 128,
        BLR_block: 129,
        BLR_error_handler: 130,
        BLR_cast: 131,
        BLR_start_savepoint: 134,
        BLR_end_savepoint: 135,

        // Access plan items
        BLR_plan: 139,
        BLR_merge: 140,
        BLR_join: 141,
        BLR_sequential: 142,
        BLR_navigational: 143,
        BLR_indices: 144,
        BLR_retrieve: 145,

        BLR_relation2: 146,
        BLR_rid2: 147,
        BLR_set_generator: 150,
        BLR_ansi_any: 151,
        BLR_exists: 152,
        BLR_record_version: 154,
        BLR_stall: 155,
        BLR_ansi_all: 158,
        BLR_extract: 159,

        // sub parameters for blr_extract
        BLR_extract_year: 0,
        BLR_extract_month: 1,
        BLR_extract_day: 2,
        BLR_extract_hour: 3,
        BLR_extract_minute: 4,
        BLR_extract_second: 5,
        BLR_extract_weekday: 6,
        BLR_extract_yearday: 7,
        // Added in FB 2.1
        BLR_extract_millisecond: 8,
        BLR_extract_week: 9,

        BLR_current_date: 160,
        BLR_current_timestamp: 161,
        BLR_current_time: 162,

        // Those codes reuse BLR code space
        BLR_post_arg: 163,
        BLR_exec_into: 164,
        BLR_user_savepoint: 165,
        BLR_dcl_cursor: 166,
        BLR_cursor_stmt: 167,
        BLR_current_timestamp2: 168,
        BLR_current_time2: 169,
        BLR_agg_list: 170,
        BLR_agg_list_distinct: 171,
        BLR_modify2: 172,

        // FB 1.0 specific BLR
        BLR_current_role: 174,
        BLR_skip: 175,

        // FB 1.5 specific BLR
        BLR_exec_sql: 176,
        BLR_internal_info: 177,
        BLR_nullsfirst: 178,
        BLR_writelock: 179,
        BLR_nullslast: 180,

        // FB 2.0 specific BLR
        BLR_lowcase: 181,
        BLR_strlen: 182,

        // sub parameter for BLR_strlen
        BLR_strlen_bit: 0,
        BLR_strlen_char: 1,
        BLR_strlen_octet: 2,

        BLR_trim: 183,

        // first sub parameter for BLR_trim
        BLR_trim_both: 0,
        BLR_trim_leading: 1,
        BLR_trim_trailing: 2,

        // second sub parameter for BLR_trim
        BLR_trim_spaces: 0,
        BLR_trim_characters: 1,

        // These codes are actions for user-defined savepoints
        BLR_savepoint_set: 0,
        BLR_savepoint_release: 1,
        BLR_savepoint_undo: 2,
        BLR_savepoint_release_single: 3,

        // These codes are actions for cursors
        BLR_cursor_open: 0,
        BLR_cursor_close: 1,
        BLR_cursor_fetch: 2,

        // FB 2.1 specific BLR
        BLR_init_variable: 184,
        BLR_recurse: 185,
        BLR_sys_function: 186,

        // FB 2.5 specific BLR
        BLR_auto_trans: 187,
        BLR_similar: 188,
        BLR_exec_stmt: 189,

        // subcodes of BLR_exec_stmt
        BLR_exec_stmt_inputs: 1,	// input parameters count
        BLR_exec_stmt_outputs: 2,	// output parameters count
        BLR_exec_stmt_sql: 3,
        BLR_exec_stmt_proc_block: 4,
        BLR_exec_stmt_data_src: 5,
        BLR_exec_stmt_user: 6,
        BLR_exec_stmt_pwd: 7,
        BLR_exec_stmt_tran: 8,	// not implemented yet
        BLR_exec_stmt_tran_clone: 9,	// make transaction parameters equal to current transaction
        BLR_exec_stmt_privs: 10,
        BLR_exec_stmt_in_params: 11,	// not named input parameters
        BLR_exec_stmt_in_params2: 12,	// named input parameters
        BLR_exec_stmt_out_params: 13,	// output parameters
        BLR_exec_stmt_role: 14,

        BLR_stmt_expr: 190,
        BLR_derived_expr: 191,

        BLR_text: 14,
        BLR_text2: 15,
        BLR_short: 7,
        BLR_long: 8,
        BLR_quad: 9,
        BLR_float: 10,
        BLR_double: 27,
        BLR_d_float: 11,
        BLR_timestamp: 35,
        BLR_varying: 37,
        BLR_varying2: 38,
        BLR_blob: 261,
        BLR_cstring: 40,
        BLR_cstring2: 41,
        BLR_blob_id: 45,
        BLR_sql_date: 12,
        BLR_sql_time: 13,
        BLR_int64: 16,
        // Added in FB 2.0
        BLR_blob2: 17,
        // Added in FB 2.1
        BLR_domain_name: 18,
        BLR_domain_name2: 19,
        BLR_not_nullable: 20,
        // Added in FB 2.5
        BLR_column_name: 21,
        BLR_column_name2: 22,
        // Added in FB 3.0
        BLR_bool: 23,

        BLR_domain_type_of: 0,
        BLR_domain_full: 1,

        ISC_info_sql_stmt_select: 1,
        ISC_info_sql_stmt_insert: 2,
        ISC_info_sql_stmt_update: 3,
        ISC_info_sql_stmt_delete: 4,
        ISC_info_sql_stmt_ddl: 5,
        ISC_info_sql_stmt_get_segment: 6,
        ISC_info_sql_stmt_put_segment: 7,
        ISC_info_sql_stmt_exec_procedure: 8,
        ISC_info_sql_stmt_start_trans: 9,
        ISC_info_sql_stmt_commit: 10,
        ISC_info_sql_stmt_rollback: 11,
        ISC_info_sql_stmt_select_for_upd: 12,
        ISC_info_sql_stmt_set_generator: 13,
        ISC_info_sql_stmt_savepoint: 14,

        ISC_blob_text: 1
    };

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
    Object.freeze(Const);
    module.exports = Const;
})();